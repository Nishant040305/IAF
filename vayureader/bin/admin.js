#!/usr/bin/env node

/**
 * VayuReader Administrator CLI Toolkit
 * 
 * Secure terminal interface for administrator actions, reporting, 
 * user manipulation, and maintenance tasks. 
 * Orchestrator File mapping everything to `src/cli/` modules.
 */

const path = require('path');
// Load environment variables before doing anything
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { program } = require('commander');
const inquirer = require('inquirer');

// DB Connections
const { connectDB } = require('../src/config/database');
const { connectRedis } = require('../src/config/redis');

// Modular CLI Components
const { shutdown } = require('../src/cli/utils');
const { login } = require('../src/cli/auth');
const { viewUsers, manipulateUser } = require('../src/cli/users');
const { manageAdmins } = require('../src/cli/admins');
const { viewAudits } = require('../src/cli/audits');
const { runMaintenanceScripts } = require('../src/cli/scripts');

// ============================================================================
// BOOTSTRAPPING
// ============================================================================

async function boot() {
    try {
        await connectDB();
        await connectRedis();
    } catch (error) {
        console.error('❌ Failed to establish backend connections:', error.message);
        process.exit(1);
    }
}

// ============================================================================
// MAIN LOOP
// ============================================================================

async function mainMenu() {
    while (true) {
        const { choice } = await inquirer.prompt([
            {
                type: 'list',
                name: 'choice',
                message: 'VayuReader Administrator Options:',
                choices: [
                    { name: '👥 View Recent Users', value: 'view_users' },
                    { name: '🔧 Manage Specific User', value: 'manage_user' },
                    { name: '🛡️ Manage Administrators', value: 'manage_admins' },
                    { name: '🔍 View Explanatory Audits Logs', value: 'view_audits' },
                    { name: '⚙️ Run Maintenance Scripts', value: 'run_scripts' },
                    new inquirer.Separator(),
                    { name: '🚪 Exit / Logout', value: 'exit' }
                ]
            }
        ]);

        switch (choice) {
            case 'view_users':
                await viewUsers();
                break;
            case 'manage_user':
                await manipulateUser();
                break;
            case 'manage_admins':
                await manageAdmins();
                break;
            case 'view_audits':
                await viewAudits();
                break;
            case 'run_scripts':
                await runMaintenanceScripts();
                break;
            case 'exit':
                await shutdown();
                return;
        }
    }
}

// ============================================================================
// INIT 
// ============================================================================

program
    .name('vayu-admin')
    .description('CLI tool for managing the backend securely via Terminal')
    .version('2.0.0');

program.parse(process.argv);

(async () => {
    await boot();
    await login();
    await mainMenu();
})();
