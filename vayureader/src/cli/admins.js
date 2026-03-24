const inquirer = require('inquirer');
const Table = require('cli-table3');
const bcrypt = require('bcrypt');
const { AdminRepository } = require('../repositories');
const { logAction, ACTION_TYPES } = require('../services/audit.service');
const { getSessionAdmin } = require('./auth');

async function manageAdmins() {
    const sessionAdmin = getSessionAdmin();

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: '🛡️ Admin Management Options:',
            choices: [
                { name: '1. View all Admins', value: 'view' },
                { name: '2. Create new Admin', value: 'create' },
                { name: '3. Update Permissions (Roles)', value: 'permissions' },
                { name: '4. Reset Admin Password', value: 'reset_pass' },
                { name: '5. Go Back', value: 'back' }
            ]
        }
    ]);

    if (action === 'back') return;

    if (action === 'view') {
        const admins = await AdminRepository.find({}, { limit: 50 });
        const table = new Table({
            head: ['ID', 'Name', 'Contact', 'Verified'],
            colWidths: [38, 25, 30, 15]
        });
        admins.forEach(a => {
            table.push([String(a._id || a.id), a.name || 'N/A', a.contact || 'N/A', a.isVerified || a.is_verified ? 'Yes' : 'No']);
        });
        console.log('\n' + table.toString() + '\n');
    }

    if (action === 'create') {
        const answers = await inquirer.prompt([
            { type: 'input', name: 'name', message: 'Name:' },
            { type: 'input', name: 'contact', message: 'Contact (Email/Phone):' },
            { type: 'password', name: 'password', message: 'Initial Password:' },
            { 
                type: 'checkbox', 
                name: 'permissions', 
                message: 'Select Permissions:', 
                choices: AdminRepository.PERMISSIONS 
            }
        ]);

        const exists = await AdminRepository.findByContact(answers.contact);
        if (exists) {
            console.log('❌ An admin with that contact already exists.\n');
        } else {
            const passwordHash = await bcrypt.hash(answers.password, 12);
            const newAdmin = await AdminRepository.create({
                name: answers.name,
                contact: answers.contact,
                passwordHash,
                permissions: answers.permissions,
                isVerified: false,
                securityQuestions: [],
                createdBy: sessionAdmin.id || sessionAdmin._id
            });
            console.log(`\n✅ Admin created successfully (ID: ${newAdmin.id || newAdmin._id}).\n`);
            await logAction(ACTION_TYPES.CREATE, 'ADMIN', newAdmin.id || newAdmin._id, sessionAdmin, { 
                contact: answers.contact, permissions: answers.permissions 
            });
        }
    }

    if (action === 'permissions') {
        const admins = await AdminRepository.find({}, { limit: 100 });
        const { targetId } = await inquirer.prompt([
            {
                type: 'list',
                name: 'targetId',
                message: 'Select Admin to update:',
                choices: admins.map(a => ({ name: `${a.name} (${a.contact})`, value: a._id || a.id }))
            }
        ]);
        
        const targetAdmin = admins.find(a => (a._id || a.id) === targetId);

        const { newPerms } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'newPerms',
                message: 'Select New Permissions:',
                choices: AdminRepository.PERMISSIONS,
                default: targetAdmin.permissions || []
            }
        ]);

        await AdminRepository.updateById(targetId, { permissions: newPerms });
        console.log('\n✅ Permissions updated.\n');
        await logAction(ACTION_TYPES.UPDATE, 'ADMIN', targetId, sessionAdmin, { 
            changed: 'permissions', new: newPerms, old: targetAdmin.permissions || [] 
        });
    }

    if (action === 'reset_pass') {
        const admins = await AdminRepository.find({}, { limit: 100 });
        const { targetId } = await inquirer.prompt([
            {
                type: 'list',
                name: 'targetId',
                message: '⚠️ Select Admin to reset password:',
                choices: admins.map(a => ({ name: `${a.name} (${a.contact})`, value: a._id || a.id }))
            }
        ]);
        
        const { newPass, confirm } = await inquirer.prompt([
            { type: 'password', name: 'newPass', message: 'Enter new strong password:' },
            { type: 'confirm', name: 'confirm', message: 'Are you sure you want to forcibly reset this password and clear their security questions?', default: false }
        ]);

        if (confirm) {
            const passwordHash = await bcrypt.hash(newPass, 12);
            await AdminRepository.updateById(targetId, { 
                passwordHash,
                isVerified: false,
                securityQuestions: []
            });
            
            try { await AdminRepository.incrementTokenVersion(targetId); } catch(e) {}

            console.log('\n✅ Password and security answers reset. Account forced into unverified state.\n');
            await logAction(ACTION_TYPES.UPDATE, 'ADMIN', targetId, sessionAdmin, { 
                action: 'FORCED_PASSWORD_RESET',
                securityQuestionsPurged: true,
                verificationRevoked: true
            });
        }
    }
}

module.exports = { manageAdmins };
