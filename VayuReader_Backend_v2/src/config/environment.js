/**
 * Environment Configuration
 * 
 * Validates and exports environment variables.
 * Server will fail fast on startup if required variables are missing.
 * 
 * @module config/environment
 */

require('dotenv').config();

// =============================================================================
// REQUIRED ENVIRONMENT VARIABLES
// =============================================================================
const REQUIRED_ENV_VARS = [
    'MONGODB_URI',
    'JWT_SECRET',
    'OTP_GATEWAY_URL'
];

/**
 * Validates that all required environment variables are present.
 * Throws an error if any are missing, preventing server startup.
 */
const validateEnv = () => {
    const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}\n` +
            `Please copy .env.example to .env and fill in the values.`
        );
    }

    // Validate JWT_SECRET minimum length
    if (process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long');
    }
};

// Run validation on module load
validateEnv();

// =============================================================================
// EXPORTED CONFIGURATION
// =============================================================================

/**
 * Server configuration
 */
const server = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production'
};

/**
 * Database configuration
 */
const database = {
    uri: process.env.MONGODB_URI,
    options: {
        // Use TLS in production, unless explicitly disabled or running on localhost
        tls: process.env.MONGODB_TLS !== 'false' && (
            process.env.MONGODB_TLS === 'true' ||
            (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI.includes('localhost') && !process.env.MONGODB_URI.includes('127.0.0.1') && !process.env.MONGODB_URI.includes('mongo'))
        ),
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        // Connection pool settings
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '50', 10),
        minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5', 10)
    }
};

/**
 * JWT configuration
 */
const jwt = {
    secret: process.env.JWT_SECRET,
    expiryDays: parseInt(process.env.JWT_EXPIRY_DAYS || '1', 10)
};

/**
 * OTP configuration
 */
const otp = {
    gatewayUrl: process.env.OTP_GATEWAY_URL,
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
    skipSend: process.env.SKIP_OTP_SEND === 'true'
};

/**
 * CORS configuration
 */
const cors = {
    allowedOrigins: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
        : []
};

/**
 * Rate limiting configuration
 */
const rateLimit = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    otpMaxRequests: parseInt(process.env.OTP_RATE_LIMIT_MAX || '5', 10)
};

/**
 * Redis configuration
 */
const redis = {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
};

module.exports = {
    server,
    database,
    jwt,
    otp,
    cors,
    rateLimit,
    redis
};
