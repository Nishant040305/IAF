/**
 * Rate Limiting Middleware
 * 
 * Provides rate limiting using Redis for distributed rate limiting.
 * This ensures rate limits work across multiple server instances.
 * 
 * @module middleware/rateLimiter
 */

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('../config/redis');
const { rateLimit: rateLimitConfig } = require('../config/environment');

/**
 * Create a Redis store for rate limiting.
 * Falls back to memory store if Redis is not available.
 */
const createRedisStore = (prefix) => {
    try {
        return new RedisStore({
            sendCommand: (...args) => redisClient.sendCommand(args),
            prefix: `rl:${prefix}:`
        });
    } catch (error) {
        console.warn(`[Rate Limiter] Redis store failed for ${prefix}, using memory store:`, error.message);
        return undefined; // Falls back to default memory store
    }
};

/**
 * General API rate limiter.
 * Limits requests per IP for all API endpoints.
 */
const apiLimiter = rateLimit({
    windowMs: rateLimitConfig.windowMs,
    max: rateLimitConfig.maxRequests,
    store: createRedisStore('api'),
    message: {
        success: false,
        message: 'Too many requests, please try again later',
        errorCode: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * OTP request rate limiter.
 * Stricter limits to prevent SMS gateway abuse and brute force.
 */
const otpLimiter = rateLimit({
    windowMs: rateLimitConfig.windowMs,
    max: rateLimitConfig.otpMaxRequests,
    store: createRedisStore('otp'),
    message: {
        success: false,
        message: 'Too many OTP requests, please try again later',
        errorCode: 'OTP_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Login attempt rate limiter.
 * Limits login attempts to prevent credential stuffing.
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    store: createRedisStore('login'),
    message: {
        success: false,
        message: 'Too many login attempts, please try again later',
        errorCode: 'LOGIN_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    apiLimiter,
    otpLimiter,
    loginLimiter
};
