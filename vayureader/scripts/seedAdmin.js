/**
 * Seed Super Admin Script
 * 
 * Usage: node scripts/seedAdmin.js <name> <phone> <password>
 */

require('dotenv').config();
const { connectPostgres, disconnectPostgres } = require('../src/db/postgres');
const { AdminRepository } = require('../src/repositories');
const { hashPassword } = require('../src/services/password.service');
const { database } = require('../src/config/environment');

const seedAdmin = async () => {
    try {
        const args = process.argv.slice(2);

        if (args.length < 3) {
            console.log('Usage: node scripts/seedAdmin.js <name> <phone> <password>');
            console.log('Example: node scripts/seedAdmin.js "John Doe" "+919876543210" "securePASS123"');
            process.exit(1);
        }

        const [name, contact, password] = args;

        console.log('Connecting to database...');
        await connectPostgres(database.postgres);

        // Check if exists
        const existing = await AdminRepository.findByContact(contact);
        if (existing) {
            console.error('❌ Admin with this contact already exists!');
            process.exit(1);
        }

        console.log('Hashing password...');
        const passwordHash = await hashPassword(password);

        console.log('Creating Super Admin...');
        const admin = await AdminRepository.create({
            name,
            contact,
            passwordHash,
            permissions: AdminRepository.PERMISSIONS, // Super admin gets all permissions
            createdBy: 'System Seed'
        });

        console.log('');
        console.log('✅ Super Admin Created Successfully!');
        console.log('-----------------------------------');
        console.log(`Name:     ${admin.name}`);
        console.log(`Contact:  ${admin.contact}`);
        console.log(`Password: [HIDDEN]`);
        console.log('-----------------------------------');

        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to seed admin:', error.message);
        process.exit(1);
    }
};

seedAdmin();
