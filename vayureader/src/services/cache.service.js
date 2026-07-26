/**
 * Cache Service
 * 
 * Provides utilities for cache management and invalidation.
 * 
 * @module services/cache.service
 */

const { redisClient } = require('../config/redis');

/**
 * Cache key patterns for different resources.
 */
const CACHE_PATTERNS = {
    PDF_CATEGORIES: 'pdf:categories',
    PDF_LIST: 'pdf:list:*',
    PDF_SEARCH: 'pdf:search:*'
};

/**
 * Invalidate PDF-related caches (categories, listings).
 */
const invalidatePdfCaches = async () => {
    try {
        await redisClient.del('pdf:categories');
        await invalidateByPattern('pdf:list:*');
        await invalidateByPattern('pdf:search:*');
    } catch (error) {
        console.error('Cache invalidation error (pdf):', error.message);
    }
};

/**
 * Invalidate all caches matching a pattern.
 * Uses SCAN for production-safe iteration.
 * @param {string} pattern - Redis key pattern
 */
const invalidateByPattern = async (pattern) => {
    try {
        let cursor = '0'; // Redis returns cursor as string
        do {
            // Redis v4 scan returns { cursor: string, keys: string[] }
            const result = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
            cursor = String(result.cursor); // Ensure it's a string for comparison
            const keys = result.keys;

            if (keys && keys.length > 0) {
                await redisClient.del(keys);
            }
        } while (cursor !== '0');
    } catch (error) {
        console.error(`Cache pattern invalidation error (${pattern}):`, error.message);
        // Don't throw - cache errors shouldn't break the main operation
    }
};

/**
 * Get cache statistics.
 * @returns {Object} Cache statistics
 */
const getCacheStats = async () => {
    try {
        const info = await redisClient.info('memory');
        const dbSize = await redisClient.dbSize();
        return {
            keyCount: dbSize,
            memoryInfo: info
        };
    } catch (error) {
        console.error('Error getting cache stats:', error.message);
        return { error: error.message };
    }
};

module.exports = {
    CACHE_PATTERNS,
    invalidatePdfCaches,
    invalidateByPattern,
    getCacheStats
};
