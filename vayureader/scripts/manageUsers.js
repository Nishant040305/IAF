/**
 * User/Admin Management Script
 * 
 * Helper script to delete or block users/admins from CLI.
 * 
 * Usage: node scripts/manageUsers.js <type> <action> <flag> <value>
 */

require('dotenv').config();
const { connectPostgres, disconnectPostgres } = require('../src/db/postgres');
const { UserRepository, AdminRepository } = require('../src/repositories');
const { database } = require('../src/config/environment');

const args = process.argv.slice(2);

const printUsage = () => {
    console.log('Usage: node scripts/manageUsers.js <type> <action> <identifier_flag> <value>');
    console.log('  type: user | admin');
    console.log('  action: delete | block | unblock');
    console.log('  identifier: --contact | --id | --device');
    console.log('    --contact: Phone number for users, Contact for admins');
    console.log('    --id: Database id');
    console.log('    --device: deviceId (only for user)');
    console.log('\nExamples:');
    console.log('  node scripts/manageUsers.js user block --contact 1234567890');
    console.log('  node scripts/manageUsers.js admin delete --id abc-def-123');
    process.exit(1);
};

if (args.length < 4) printUsage();

const [type, action, flag, value] = args;

const run = async () => {
    try {
        console.log('Connecting to PostgreSQL...');
        await connectPostgres(database.postgres);
        console.log('Connected to PostgreSQL');
    } catch (err) {
        console.error('DB Connection Error:', err);
        process.exit(1);
    }

    let repo;
    if (type === 'user') repo = UserRepository;
    else if (type === 'admin') repo = AdminRepository;
    else {
        console.error('Invalid type. Must be "user" or "admin".');
        process.exit(1);
    }

    let filter = {};
    if (flag === '--id') filter = { id: value };
    else if (flag === '--contact') {
        if (type === 'user') filter = { phone_number: value };
        else filter = { contact: value };
    } else if (flag === '--device') {
        if (type === 'user') filter = { deviceId: value };
        else {
            console.error('--device flag is only valid for user type.');
            process.exit(1);
        }
    } else {
        console.error(`Invalid identifier flag: ${flag}`);
        process.exit(1);
    }

    try {
        let doc;
        if (flag === '--id') {
            doc = await repo.findById(value);
        } else {
            doc = await repo.findOne(filter);
        }

        if (!doc) {
            console.log(`${type} not found with ${flag} = ${value}`);
            process.exit(0);
        }

        console.log(`Found ${type}: ${doc._id} (${doc.name})`);

        if (action === 'delete') {
            await repo.deleteById(doc._id);
            console.log(`${type} deleted successfully.`);
        } else if (action === 'block') {
            if (type === 'user') {
                await repo.updateById(doc._id, { isBlocked: true });
                console.log(`User blocked successfully.`);
            } else {
                console.log('Blocking not supported for admins (use delete).');
            }
        } else if (action === 'unblock') {
            if (type === 'user') {
                await repo.updateById(doc._id, { isBlocked: false });
                console.log(`User unblocked successfully.`);
            } else {
                console.log('Unblocking not supported for admins.');
            }
        } else {
            console.error('Invalid action. Use delete, block, or unblock.');
        }

    } catch (err) {
        console.error('Error executing action:', err.message);
    } finally {
        await disconnectPostgres();
        console.log('Disconnected from DB');
        process.exit(0);
    }
};

run();
