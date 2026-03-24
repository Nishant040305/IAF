const inquirer = require('inquirer');
const Table = require('cli-table3');
const { UserRepository } = require('../repositories');
const { logAction, ACTION_TYPES } = require('../services/audit.service');
const { getSessionAdmin } = require('./auth');

async function viewUsers() {
    const users = await UserRepository.find({}, { limit: 50, sort: { createdAt: -1 } });

    if (!users || users.length === 0) {
        console.log('\nNo users found in database.\n');
        return;
    }

    const table = new Table({
        head: ['ID', 'Name', 'Phone', 'Created', 'Status'],
        colWidths: [38, 25, 15, 22, 12]
    });

    users.forEach(u => {
        const idStr = String(u._id || u.id);
        const name = u.name || 'N/A';
        const phone = u.phone_number || u.phoneNumber || 'N/A';
        const created = new Date(u.createdAt || u.created_at).toLocaleDateString();
        const status = u.isActive === false ? 'DISABLED' : 'ACTIVE';
        table.push([idStr, name, phone, created, status]);
    });

    console.log('\n' + table.toString() + '\n');
}

async function manipulateUser() {
    const { phone } = await inquirer.prompt([
        { type: 'input', name: 'phone', message: 'Enter exact user Phone Number to search:' }
    ]);

    const user = await UserRepository.findByPhone(phone);
    if (!user) {
        console.log('❌ No user found matching that phone number.\n');
        return;
    }

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: `User: ${user.name} (${user._id || user.id}). What do you want to do?`,
            choices: [
                { name: user.isActive === false ? '🟢 Enable User' : '🔴 Disable User', value: 'toggle_status' },
                { name: '↩️ Go Back', value: 'back' }
            ]
        }
    ]);

    if (action === 'toggle_status') {
        const newStatus = user.isActive === false;
        await UserRepository.updateById(user._id || user.id, { isActive: newStatus });
        console.log(`\n✅ User status changed to: ${newStatus ? 'ACTIVE' : 'DISABLED'}\n`);

        await logAction(ACTION_TYPES.UPDATE, 'USER', user._id || user.id, getSessionAdmin(), {
            changed: 'isActive',
            oldValue: !newStatus,
            newValue: newStatus,
            reason: 'CLI Administrator Action'
        });
    }
}

module.exports = { viewUsers, manipulateUser };
