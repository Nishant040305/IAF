/**
 * Audit Worker
 * 
 * Registers the background consumers for audit-related queues.
 * This file should run alongside the server application or as a separate process.
 * 
 * @module workers/audit.worker
 */
const { QueueManager, QUEUE_ROUTES } = require('../queues');
const { AuditLogRepository, UserAuditRepository } = require('../repositories');

const startAuditWorkers = () => {
    console.log('Starting Audit Background Workers...');

    // 1. Setup Admin Audit Log Batch Worker
    QueueManager.createBatchWorker(
        QUEUE_ROUTES.AUDIT_LOGS,
        async (batchArray) => {
            await AuditLogRepository.createBatch(batchArray);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[Worker: ${QUEUE_ROUTES.AUDIT_LOGS}] Batched ${batchArray.length} records into ClickHouse`);
            }
        },
        { maxBatchSize: 1000, maxWaitTimeMs: 5000 }
    );

    // 2. Setup User Audit Log Batch Worker
    QueueManager.createBatchWorker(
        QUEUE_ROUTES.USER_AUDIT_LOGS,
        async (batchArray) => {
            await UserAuditRepository.createBatch(batchArray);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[Worker: ${QUEUE_ROUTES.USER_AUDIT_LOGS}] Batched ${batchArray.length} records into ClickHouse`);
            }
        },
        { maxBatchSize: 1000, maxWaitTimeMs: 5000 }
    );
};

// Export to be instantiated in the main server logic
module.exports = startAuditWorkers;
