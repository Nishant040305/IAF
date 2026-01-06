/**
 * Super Admin Creation Script
 *
 * Usage: node scripts/create-super-admin.js "Admin Name" "9999988888"
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Admin = require('../src/models/Admin');

const createSuperAdmin = async () => {
    const name = process.argv[2];
    const contact = process.argv[3];

    if (!name || !contact) {
        console.error('Usage: node scripts/create-super-admin.js "Admin Name" "PhoneNumber"');
        process.exit(1);
    }

    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const existing = await Admin.findOne({ contact });
        if (existing) {
            console.log(`Admin with contact ${contact} already exists updating to Super Admin...`);
            existing.isSuperAdmin = true;
            await existing.save();
            console.log('Updated successfully.');
        } else {
            const newAdmin = new Admin({
                name,
                contact,
                isSuperAdmin: true,
                permissions: [] // Super admins have all permissions by default in schema
            });

            await newAdmin.save();
            console.log('Super Admin created successfully.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

createSuperAdmin();
