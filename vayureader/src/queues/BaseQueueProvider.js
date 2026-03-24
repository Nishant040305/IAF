/**
 * Abstract Base Queue Provider
 * 
 * Defines the contract that any queuing implementation (BullMQ, Kafka, SQS) 
 * must conform to. This ensures the business logic remains fully decoupled 
 * from the underlying transport mechanism.
 * 
 * @module queues/BaseQueueProvider
 */
class BaseQueueProvider {
    /**
     * Publish a payload (or list of payloads) to the queue.
     * 
     * @param {string} queueName - The logical name of the queue/topic
     * @param {Object} data - The payload to reliably transport
     * @param {Object} [options={}] - Meta options (e.g., delay, priority)
     */
    async enqueue(queueName, data, options = {}) {
        throw new Error('Method "enqueue(queueName, data, options)" must be implemented.');
    }

    /**
     * Start consuming jobs one-by-one or in sequence.
     * 
     * @param {string} queueName - The queue to listen on
     * @param {Function} handlerFn - The function to process the parsed payload
     * @param {Object} [options={}] - Concurrency and prefetch options
     */
    createWorker(queueName, handlerFn, options = {}) {
        throw new Error('Method "createWorker(queueName, handlerFn, options)" must be implemented.');
    }

    /**
     * Some data destinations (like ClickHouse) require bulk insertion.
     * This abstract method guarantees that the underlying driver will gather 
     * multiple messages and provide them to the handler as an array.
     * 
     * @param {string} queueName - The queue to listen on
     * @param {Function} handlerFn - The function handling an ARRAY of payloads
     * @param {Object} batchOptions - Defines maximum array sizes and timeouts
     */
    createBatchWorker(queueName, handlerFn, batchOptions = { maxBatchSize: 100, maxWaitTimeMs: 5000 }) {
        throw new Error('Method "createBatchWorker(queueName, handlerFn, batchOptions)" must be implemented.');
    }

    /**
     * Gracefully tear down all active consumers and connections.
     */
    async close() {
        throw new Error('Method "close()" must be implemented.');
    }
}

module.exports = BaseQueueProvider;
