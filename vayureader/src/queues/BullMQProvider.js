/**
 * BullMQ Queue Provider
 * 
 * Implementation of BaseQueueProvider using BullMQ. 
 * Connects directly to our existing Redis instance.
 * 
 * @module queues/BullMQProvider
 */
const { Queue, Worker } = require('bullmq');
const { redis: redisConfig } = require('../config/environment');
const BaseQueueProvider = require('./BaseQueueProvider');

class BullMQProvider extends BaseQueueProvider {
    constructor() {
        super();
        // Standardize the connection format for BullMQ
        this.connection = { url: redisConfig.url };
        
        // Cache our initialized structures so we don't recreate them
        this.queues = new Map();
        this.workers = new Map();
        
        // Internal batching buffer
        this._batchBuffers = new Map();
    }

    /**
     * Internal singleton-like getter to prevent connection thrashing
     */
    _getQueue(queueName) {
        if (!this.queues.has(queueName)) {
            const newQueue = new Queue(queueName, { connection: this.connection });
            this.queues.set(queueName, newQueue);
        }
        return this.queues.get(queueName);
    }

    /**
     * Fire and forget into BullMQ.
     */
    async enqueue(queueName, data, options = {}) {
        const queue = this._getQueue(queueName);
        // Using "process" as a generic job descriptor inside the queue
        return queue.add('process', data, options);
    }

    /**
     * Normal single-job consumer.
     */
    createWorker(queueName, handlerFn, options = {}) {
        if (this.workers.has(queueName)) {
            console.warn(`[BullMQ] Worker for queue ${queueName} is already listening.`);
            return this.workers.get(queueName);
        }

        const worker = new Worker(queueName, async (job) => {
            return handlerFn(job.data);
        }, {
            connection: this.connection,
            ...options
        });

        worker.on('failed', (job, err) => {
            console.error(`[BullMQ] Job ${job?.id} in ${queueName} failed: ${err.message}`);
        });

        worker.on('error', (err) => {
            console.error(`[BullMQ] Error from worker ${queueName}: ${err.message}`);
        });

        this.workers.set(queueName, worker);
        return worker;
    }

    /**
     * BullMQ does not expose a native 'batch' consumer.
     * We simulate an atomic Kafka-like eachBatch loop here perfectly suited for ClickHouse.
     */
    createBatchWorker(queueName, batchHandlerFn, batchOptions = { maxBatchSize: 1000, maxWaitTimeMs: 5000 }) {
        // We configure the BullHQ worker to pull one-by-one but we intercept the payload, 
        // buffer it, and flush on boundaries.
        
        if (!this._batchBuffers.has(queueName)) {
            this._batchBuffers.set(queueName, { items: [], timeoutId: null });
        }

        const bufferState = this._batchBuffers.get(queueName);

        const flushBatch = async () => {
            if (bufferState.items.length === 0) return;
            
            // Extract the whole buffered set safely
            const payloadArray = bufferState.items.map(item => item.data);
            const jobTokens = bufferState.items.map(item => item.resolve);
            
            bufferState.items = [];
            
            try {
                // Yield the array completely to the handler (e.g., ClickHouse bulk insert)
                await batchHandlerFn(payloadArray);
                
                // If successful, resolve all BullMQ promises back successfully
                jobTokens.forEach(resolve => resolve());
            } catch (err) {
                console.error(`[BullMQ] Batch processing failed on ${queueName}:`, err.message);
                // If the batch hard-failed, reject all inner promises. BullMQ handles retry automatically.
                bufferState.items.forEach(item => item.reject(err));
            }
        };

        // Standard worker that stalls the success of the job until the batch flushes
        const worker = new Worker(queueName, (job) => {
            return new Promise((resolve, reject) => {
                bufferState.items.push({ data: job.data, resolve, reject, job });
                
                // Flush if size limit is hit
                if (bufferState.items.length >= batchOptions.maxBatchSize) {
                    if (bufferState.timeoutId) clearTimeout(bufferState.timeoutId);
                    bufferState.timeoutId = null;
                    flushBatch();
                } else if (!bufferState.timeoutId) {
                    // Set up time-bound flush if it hasn't fired yet
                    bufferState.timeoutId = setTimeout(() => {
                        bufferState.timeoutId = null;
                        flushBatch();
                    }, batchOptions.maxWaitTimeMs);
                }
            });
        }, {
            connection: this.connection,
            // Ensure BullHQ allows many concurrently suspended promises
            concurrency: batchOptions.maxBatchSize + 10,
            ...batchOptions.workerOptions
        });

        this.workers.set(`${queueName}:batch`, worker);
        return worker;
    }

    async close() {
        const promises = [];
        for (const worker of this.workers.values()) {
            promises.push(worker.close());
        }
        for (const queue of this.queues.values()) {
            promises.push(queue.close());
        }
        await Promise.all(promises);
        this.workers.clear();
        this.queues.clear();
    }
}

module.exports = BullMQProvider;
