const inquirer = require('inquirer');
const bcrypt = require('bcrypt');
const { AdminRepository } = require('../repositories');
const { logAction } = require('../services/audit.service');
const { generateOtp, saveOtp, verifyOtp } = require('../services/otp.service');
const { sendOtpSms } = require('../services/sms.service');
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
            name: 'contact',
            message: 'Contact Number (or Email):',
            validate: val => val ? true : 'Contact is required'
        },
        {
            type: 'password',
            name: 'password',
            message: 'Password:',
            mask: '*',
            validate: val => val ? true : 'Password is required'
        }
    ]);

    const admin = await AdminRepository.findByContact(credentials.contact);
    if (!admin) {
        console.error('❌ Invalid credentials. Access denied.');
        return await promptRetry();
    }

    const isValid = await bcrypt.compare(credentials.password, admin.passwordHash || admin.password_hash);
    if (!isValid) {
        console.error('❌ Invalid credentials. Access denied.');
        return await promptRetry();
    }

    // Secondary Security: 2FA / OTP Verification
    console.log(`\n📲 Sending secure verification code to ${admin.contact}...`);
    const otpCode = generateOtp();
    await saveOtp(admin.contact, otpCode);
    
    // In dev mode (skipSend), it prints to the console directly via sendOtpSms logic
    await sendOtpSms(admin.contact, otpCode);

    const { providedOtp } = await inquirer.prompt([
        { 
            type: 'input', 
            name: 'providedOtp', 
            message: 'Enter the 6-digit OTP code received:',
            validate: val => val.length === 6 ? true : 'Must be exactly 6 digits.' 
        }
    ]);

    const verification = await verifyOtp(providedOtp, admin.contact);
    if (!verification.valid) {
        console.error(`❌ OTP Verification Failed: ${verification.error}`);
        return await promptRetry();
    }

    sessionAdmin = admin;
    console.log(`\n✅ Authenticated securely as ${admin.name} (${admin.id || admin._id})\n`);

    // Log the CLI login instance into the global audit logs
    await logAction('CLI_LOGIN_2FA', 'ADMIN', admin.id || admin._id, sessionAdmin, { ip: '127.0.0.1 (CLI)' });
}

module.exports = { login, getSessionAdmin };
