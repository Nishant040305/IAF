const inquirer = require('inquirer');
const bcrypt = require('bcrypt');
const { AdminRepository } = require('../repositories');
const { logAction } = require('../services/audit.service');
const { shutdown } = require('./utils');

let sessionAdmin = null;

const getSessionAdmin = () => sessionAdmin;

async function promptRetry() {
    const { retry } = await inquirer.prompt([
        { type: 'confirm', name: 'retry', message: 'Try again?', default: true }
    ]);
    if (retry) {
        return login();
    }
    await shutdown();
}

async function login() {
    console.log('\n🔒 VayuReader Admin CLI - Secure Login Required\n');
    const credentials = await inquirer.prompt([
        {
            type: 'input',
            name: 'email',
            message: 'Administrative Email:',
            validate: val => val ? true : 'Email is required'
        },
        {
            type: 'password',
            name: 'password',
            message: 'Password:',
            mask: '*',
            validate: val => val ? true : 'Password is required'
        }
    ]);

    const admin = await AdminRepository.findByContact(credentials.email);
    if (!admin) {
        console.error('❌ Invalid credentials. Access denied.');
        return await promptRetry();
    }

    const isValid = await bcrypt.compare(credentials.password, admin.passwordHash || admin.password_hash);
    if (!isValid) {
        console.error('❌ Invalid credentials. Access denied.');
        return await promptRetry();
    }

    sessionAdmin = admin;
    console.log(`\n✅ Authenticated securely as ${admin.name} (${admin.id || admin._id})\n`);

    // Log the CLI login instance into the global audit logs
    await logAction('CLI_LOGIN', 'ADMIN', admin.id || admin._id, sessionAdmin, { ip: '127.0.0.1 (CLI)' });
}

module.exports = { login, getSessionAdmin };
