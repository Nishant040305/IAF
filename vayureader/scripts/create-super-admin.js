/**
 * Super Admin Creation Script
 *
 * Usage: node scripts/create-super-admin.js --name "Admin Name" --contact 9999988888 --password SecurePass123
 * 
 * Creates initial super admin with password for 2FA authentication.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectPostgres, disconnectPostgres } = require('../src/db/postgres');
const { AdminRepository } = require('../src/repositories');
const { hashPassword } = require('../src/services/password.service');
const { database } = require('../src/config/environment');

const args = process.argv.slice(2);

function getArg(name) {
    const index = args.indexOf(`--${name}`);
    return index !== -1 ? args[index + 1] : null;
}

const createSuperAdmin = async () => {
    const name = getArg('name');
    const contact = getArg('contact');
    const password = getArg('password');

    if (!name || !contact || !password) {
        console.error('Usage: node scripts/create-super-admin.js --name "Admin Name" --contact 9999988888 --password SecurePass123');
        process.exit(1);
    }

    if (password.length < 8) {
        console.error('Error: Password must be at least 8 characters');
        process.exit(1);
    }

    try {
        console.log('Connecting to database...');
        await connectPostgres(database.postgres);
        console.log('Connected.');

        // Hash password
        const passwordHash = await hashPassword(password);

        const existing = await AdminRepository.findByContact(contact);
        if (existing) {
            console.log(`Admin with contact ${contact} already exists. Updating...`);
            await AdminRepository.updateById(existing._id, {
                permissions: AdminRepository.PERMISSIONS,
                passwordHash
            });
            console.log('Updated to Admin with all permissions and new password.');
        } else {
            const newAdmin = await AdminRepository.create({
                name,
                contact,
                permissions: AdminRepository.PERMISSIONS,
                passwordHash
            });

            console.log('\n✅ Admin created successfully!');
            console.log(`   Name: ${name}`);
            console.log(`   Contact: ${contact}`);
            console.log(`\n   Login with contact + password, then verify OTP.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

createSuperAdmin();
