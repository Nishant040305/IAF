#!/usr/bin/env node

/**
 * Log Cleanup Script
 * 
 * Deletes audit logs (UserAudit and AuditLog) older than a specified retention period.
 * 
 * Usage: node scripts/cleanupLogs.js --days <number_of_days> [--dry-run]
 * Example: node scripts/cleanupLogs.js --days 90
 */

require('dotenv').config();
const { connectClickHouse, disconnectClickHouse, getClickHouseClient } = require('../src/db/clickhouse');
const { AuditLogRepository, UserAuditRepository } = require('../src/repositories');
const { database } = require('../src/config/environment');

const args = process.argv.slice(2);

// Parse arguments
const getArg = (flag) => {
    const index = args.indexOf(flag);
    return index !== -1 ? args[index + 1] : null;
};

const hasFlag = (flag) => args.includes(flag);

const days = parseInt(getArg('--days') || '90', 10);
const dryRun = hasFlag('--dry-run');

if (isNaN(days) || days < 1) {
    console.error('Error: Please specify a valid number of days (minimum 1).');
    console.log('Usage: node scripts/cleanupLogs.js --days <number> [--dry-run]');
    process.exit(1);
}

const cleanup = async () => {
    try {
        console.log('Connecting to ClickHouse...');
        await connectClickHouse(database.clickhouse);
        console.log('Connected to ClickHouse');

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        console.log(`\nCleanup Configuration:`);
        console.log(`- Retention Days: ${days}`);
        console.log(`- Cutoff Date: ${cutoffDate.toISOString()}`);
        console.log(`- Mode: ${dryRun ? 'DRY RUN (no deletions)' : 'LIVE (will delete)'}`);
        console.log('-'.repeat(40));

        // Count logs to be deleted
        const userAuditCount = await UserAuditRepository.count({
            timestamp: { $lt: cutoffDate }
        });
        const auditLogCount = await AuditLogRepository.count({
            timestamp: { $lt: cutoffDate }
        });

        console.log(`\nFound logs older than ${days} days:`);
        console.log(`- UserAudit: ${userAuditCount} records`);
        console.log(`- AuditLog: ${auditLogCount} records`);

        if (dryRun) {
            console.log('\n[DRY RUN] Skipping deletion.');
        } else {
            if (userAuditCount > 0) {
                console.log('\nDeleting old UserAudit logs...');
                await UserAuditRepository.deleteOlderThan(cutoffDate);
                console.log(`✓ Deleted UserAudit records older than ${cutoffDate.toISOString()}`);
            } else {
                console.log('\nNo old UserAudit logs to delete.');
            }

            if (auditLogCount > 0) {
                console.log('\nDeleting old AuditLog logs...');
                await AuditLogRepository.deleteOlderThan(cutoffDate);
                console.log(`✓ Deleted AuditLog records older than ${cutoffDate.toISOString()}`);
            } else {
                console.log('\nNo old AuditLog logs to delete.');
            }
        }

        console.log('\nCleanup completed successfully!');

    } catch (error) {
        console.error('\n❌ Error during cleanup:', error.message);
        process.exit(1);
    } finally {
        await disconnectClickHouse();
        console.log('Disconnected from ClickHouse');
        process.exit(0);
    }
};

// Confirm before running if not dry-run and high count (optional safety, implemented as delay here for simplicity)
if (!dryRun) {
    console.log('Starting cleanup in 3 seconds... (Ctrl+C to cancel)');
    setTimeout(cleanup, 3000);
} else {
    cleanup();
}
