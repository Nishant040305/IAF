const inquirer = require('inquirer');
const { execSync } = require('child_process');
const path = require('path');
const { logAction } = require('../services/audit.service');
const { getSessionAdmin } = require('./auth');

async function runMaintenanceScripts() {
    const scripts = [
        { name: '1. Clean up stale logs (logs:clean)', cmd: 'npm run logs:clean' },
        { name: '2. Optimize PostgreSQL Tables (db:optimize)', cmd: 'npm run db:optimize' },
        { name: '3. Sync Elasticsearch Indexes (es:sync)', cmd: 'npm run es:sync' },
        { name: '4. Go Back', cmd: 'back' }
    ];

    const { script } = await inquirer.prompt([
        {
            type: 'list',
            name: 'script',
            message: 'Select a script to run:',
            choices: scripts.map(s => ({ name: s.name, value: s.cmd }))
        }
    ]);

    if (script === 'back') return;

    try {
        console.log(`\nExecuting: ${script}\n`);
        // Navigate to project root to run NPM scripts properly
        execSync(script, { cwd: path.join(__dirname, '../..'), stdio: 'inherit' });

        await logAction('MAINTENANCE_SCRIPT_EXEC', 'SYSTEM', 'CLI_RUNNER', getSessionAdmin(), {
            scriptRan: script
        });

        console.log('\n✅ Script executed successfully.\n');
    } catch (err) {
        console.error('\n❌ Script execution failed.\n');
    }
}

module.exports = { runMaintenanceScripts };
