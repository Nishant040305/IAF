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
    'POSTGRES_URI',
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
    isDevelopment: process.env.NODE_ENV !== 'production',
    // SECURITY: TESTING mode is NEVER allowed in production to prevent
    // SameSite=None cookies which would disable CSRF protection.
    isTesting: process.env.TESTING === 'true' && process.env.NODE_ENV !== 'production',
    // SECURITY_BYPASS: Disables E2EE encryption and DPoP for development/debugging.
    // NEVER allowed in production.
    securityBypass: process.env.SECURITY_BYPASS === 'true' && process.env.NODE_ENV !== 'production'
};

/**
 * Database configuration
 */
const database = {
    postgres: {
        connectionString: process.env.POSTGRES_URI,
        max: parseInt(process.env.PG_MAX_POOL_SIZE || '50', 10),
        min: parseInt(process.env.PG_MIN_POOL_SIZE || '5', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ...(process.env.NODE_ENV === 'production' && process.env.PG_SSL !== 'false' ? {
            ssl: { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false' }
        } : {})
    },
    clickhouse: {
        url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
        database: process.env.CLICKHOUSE_DATABASE || 'vayureader_logs',
        username: process.env.CLICKHOUSE_USER || 'default',
        password: process.env.CLICKHOUSE_PASSWORD || ''
    }
};

/**
 * JWT configuration
 */
const jwt = {
    secret: process.env.JWT_SECRET,
    expiryDays: parseInt(process.env.JWT_EXPIRY_DAYS || '1', 10),
    lifetimeDays: parseInt(process.env.JWT_LIFETIME_DAYS || '36500', 10) // Default 100 years
};

/**
 * OTP configuration
 */
const otp = {
    gatewayUrl: process.env.OTP_GATEWAY_URL,
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
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
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500', 10), // Increased for admin dashboard
    otpMaxRequests: parseInt(process.env.OTP_RATE_LIMIT_MAX || '5', 10)
};

/**
 * Redis configuration
 */
const redis = {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
};

/**
 * DPoP (Proof-of-Possession) configuration
 */
const dpop = {
    // DPoP is automatically disabled when SECURITY_BYPASS is active
    enabled: server.securityBypass ? false : process.env.DPOP_ENABLED !== 'false',
    proofTtlSeconds: parseInt(process.env.DPOP_PROOF_TTL_SECONDS || '120', 10),
    maxIatSkewSeconds: parseInt(process.env.DPOP_MAX_IAT_SKEW_SECONDS || '90', 10),
    allowQueryProof: process.env.DPOP_ALLOW_QUERY_PROOF !== 'false'
};

/**
 * PDF Security configuration
 * 
 * Security modes:
 * - 'strict': Block critical, high, and medium threats (recommended for IAF)
 * - 'moderate': Block critical and high threats only
 * - 'permissive': Block only critical threats (not recommended)
 */
const pdfSecurity = {
    scanMode: process.env.PDF_SECURITY_MODE || 'strict',
    maxFileSizeMB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '100', 10)
};

module.exports = {
    server,
    database,
    jwt,
    otp,
    cors,
    rateLimit,
    redis,
    dpop,
    pdfSecurity
};
