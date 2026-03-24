/**
 * Queue Orchestrator / Factory
 * 
 * Exports the active queue provider singleton according to our environment.
 * If you ever need to pivot perfectly to Kafka or SQS, swap the instantiation 
 * here and the rest of the generic application remains perfectly untouched.
 * 
 * @module queues/index
 */
const BullMQProvider = require('./BullMQProvider');

// Example: Switch implementation dynamically later if scale demands it!
// const KafkaProvider = require('./KafkaProvider');
// 
// const QueueManager = process.env.QUEUE_DRIVER === 'kafka' 
//      ? new KafkaProvider() 
//      : new BullMQProvider();

const QueueManager = new BullMQProvider();

// Shared logical queue names constant, preventing typos across apps
const QUEUE_ROUTES = {
    AUDIT_LOGS: 'vayureader.audit.logs',
    USER_AUDIT_LOGS: 'vayureader.user_audit.logs',
    PDF_VIEWS: 'vayureader.pdf.views'
};

module.exports = {
    QueueManager,
    QUEUE_ROUTES
};
