/**
 * Audit Worker
 * 
 * Registers the background consumers for audit-related queues.
 * This file should run alongside the server application or as a separate process.
 * 
 * @module workers/audit.worker
 */
const { QueueManager, QUEUE_ROUTES } = require('../queues');
const { AuditLogRepository, UserAuditRepository, PdfDocumentRepository } = require('../repositories');
const { queue } = require('../config/environment');

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
        { maxBatchSize: queue.auditBatchSize, maxWaitTimeMs: queue.auditWaitTimeMs }
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
        { maxBatchSize: queue.auditBatchSize, maxWaitTimeMs: queue.auditWaitTimeMs }
    );

    // 3. Setup PDF View Count Batch Worker
    QueueManager.createBatchWorker(
        QUEUE_ROUTES.PDF_VIEWS,
        async (batchArray) => {
            // Aggregate simple array of { pdfId: 'XYZ' } into { 'XYZ': 5, 'ABC': 2 }
            const aggregatedCounts = {};
            for (const item of batchArray) {
                if (item && item.pdfId) {
                    aggregatedCounts[item.pdfId] = (aggregatedCounts[item.pdfId] || 0) + 1;
                }
            }

            const uniquePdfsCount = Object.keys(aggregatedCounts).length;
            if (uniquePdfsCount > 0) {
                await PdfDocumentRepository.incrementViewCountsBulk(aggregatedCounts);
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`[Worker: ${QUEUE_ROUTES.PDF_VIEWS}] Incremented view counts for ${uniquePdfsCount} distinct PDFs.`);
                }
            }
        },
        { maxBatchSize: queue.pdfViewBatchSize, maxWaitTimeMs: queue.pdfViewWaitTimeMs }
    );
};

// Export to be instantiated in the main server logic
module.exports = startAuditWorkers;
