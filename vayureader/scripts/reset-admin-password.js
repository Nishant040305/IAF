/**
 * Reset Admin Password Script
 * 
 * Usage:
 *   node scripts/reset-admin-password.js --contact +91XXXXXXXXXX --password NewSecurePass123
 * 
 * This script manually resets an admin's password.
 * Use when an admin forgets their password.
 */

require('dotenv').config();
const { connectPostgres, disconnectPostgres } = require('../src/db/postgres');
const { AdminRepository } = require('../src/repositories');
const { hashPassword } = require('../src/services/password.service');
const { database } = require('../src/config/environment');

const args = process.argv.slice(2);

function getArg(name) {
    const index = args.indexOf(`--${name}`);
    return index !== -1 ? args[index + 1] : null;
}

async function resetPassword() {
    const contact = getArg('contact');
    const password = getArg('password');

    if (!contact || !password) {
        console.error('Usage: node scripts/reset-admin-password.js --contact +91XXXXXXXXXX --password NewSecurePass123');
        process.exit(1);
    }

    if (password.length < 8) {
        console.error('Error: Password must be at least 8 characters');
        process.exit(1);
    }

    try {
        // Connect to PostgreSQL
        await connectPostgres(database.postgres);
        console.log('Connected to PostgreSQL');

        // Find admin
        const admin = await AdminRepository.findByContact(contact);

        if (!admin) {
            console.error(`Error: No admin found with contact: ${contact}`);
            process.exit(1);
        }

        // Hash new password
        const passwordHash = await hashPassword(password);

        // Update password
        await AdminRepository.updateById(admin._id, { passwordHash });

        console.log(`\n✅ Password reset successfully for:`);
        console.log(`   Name: ${admin.name}`);
        console.log(`   Contact: ${admin.contact}`);
        console.log(`\n   The admin can now login with the new password.`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await disconnectPostgres();
    }
}

resetPassword();
