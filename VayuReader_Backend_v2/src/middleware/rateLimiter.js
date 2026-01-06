/**
 * Rate Limiting Middleware
 * 
 * Provides rate limiting to prevent brute force attacks and API abuse.
 * 
 * @module middleware/rateLimiter
 */

const rateLimit = require('express-rate-limit');
const { rateLimit: rateLimitConfig } = require('../config/environment');

/**
 * General API rate limiter.
 * Limits requests per IP for all API endpoints.
 */
const apiLimiter = rateLimit({
    windowMs: rateLimitConfig.windowMs,
    max: rateLimitConfig.maxRequests,
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
