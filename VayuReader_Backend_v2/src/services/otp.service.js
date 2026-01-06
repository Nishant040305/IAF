const crypto = require('crypto');
const { otp: otpConfig, jwt: jwtConfig } = require('../config/environment');
const { redisClient } = require('../config/redis');

// Prefix for Redis keys
const KEY_PREFIX = 'vayureader-otp:';
const TOKEN_PREFIX = 'vayureader-login-token:';

/**
 * Generates a secure random login token.
 * This token is returned after password verification and used to encrypt the OTP.
 * @returns {string} 32-character hex token
 */
const generateLoginToken = () => {
    return crypto.randomBytes(16).toString('hex');
};

/**
 * Derives a 32-byte encryption key from the login token.
 * @param {string} loginToken 
 */
const getEncryptionKeyFromToken = (loginToken) => {
    return crypto.createHash('sha256').update(loginToken + jwtConfig.secret).digest();
};

/**
 * Encrypts a string using AES-256-GCM with login token as key.
 * @param {string} text 
 * @param {string} loginToken
 * @returns {string} iv:authTag:encrypted (base64)
 */
const encrypt = (text, loginToken) => {
    const iv = crypto.randomBytes(12);
    const key = getEncryptionKeyFromToken(loginToken);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag().toString('base64');

    return `${iv.toString('base64')}:${authTag}:${encrypted}`;
};

/**
 * Decrypts a string using AES-256-GCM with login token as key.
 * @param {string} encryptedData iv:authTag:encrypted
 * @param {string} loginToken
 * @returns {string|null} decrypted text or null on failure
 */
const decrypt = (encryptedData, loginToken) => {
    try {
        const [ivBase64, authTagBase64, encryptedBase64] = encryptedData.split(':');

        const iv = Buffer.from(ivBase64, 'base64');
        const authTag = Buffer.from(authTagBase64, 'base64');
        const key = getEncryptionKeyFromToken(loginToken);

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('[OTP Decryption Error]:', error.message);
        return null;
    }
};

/**
 * Generates a 6-digit OTP code.
 */
const generateOtp = () => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Saves ENCRYPTED OTP to Redis with a TTL.
 * OTP is encrypted using the login token.
 * 
 * @param {string} identifier - unique key (e.g., phone)
 * @param {string} otp - OTP code (plain text)
 * @param {string} loginToken - login token used for encryption
 * @returns {Promise<void>}
 */
const saveOtp = async (identifier, otp, loginToken) => {
    const key = `${KEY_PREFIX}${identifier}`;
    const encryptedOtp = encrypt(otp, loginToken);
    const ttlSeconds = otpConfig.expiryMinutes * 60;
    await redisClient.set(key, encryptedOtp, {
        EX: ttlSeconds
    });

    // Also store the login token hash for validation
    const tokenKey = `${TOKEN_PREFIX}${identifier}`;
    const tokenHash = crypto.createHash('sha256').update(loginToken).digest('hex');
    await redisClient.set(tokenKey, tokenHash, {
        EX: ttlSeconds
    });
};

/**
 * Retrieves and DECRYPTS OTP from Redis using login token.
 */
const getOtp = async (identifier, loginToken) => {
    const key = `${KEY_PREFIX}${identifier}`;
    const encryptedData = await redisClient.get(key);

    if (!encryptedData) return null;

    return decrypt(encryptedData, loginToken);
};

/**
 * Deletes OTP and login token from Redis.
 */
const deleteOtp = async (identifier) => {
    const key = `${KEY_PREFIX}${identifier}`;
    const tokenKey = `${TOKEN_PREFIX}${identifier}`;
    await redisClient.del(key);
    await redisClient.del(tokenKey);
};

/**
 * Validates that the provided login token matches the stored hash.
 */
const validateLoginToken = async (identifier, loginToken) => {
    const tokenKey = `${TOKEN_PREFIX}${identifier}`;
    const storedHash = await redisClient.get(tokenKey);

    if (!storedHash) return false;

    const providedHash = crypto.createHash('sha256').update(loginToken).digest('hex');
    return storedHash === providedHash;
};

/**
 * Verifies an OTP code against Redis value using login token.
 */
const verifyOtp = async (providedOtp, identifier, loginToken) => {
    // First validate the login token
    const isTokenValid = await validateLoginToken(identifier, loginToken);
    if (!isTokenValid) {
        return {
            valid: false,
            error: 'Invalid or expired login session. Please login again.'
        };
    }

    const storedOtp = await getOtp(identifier, loginToken);

    if (!storedOtp) {
        return {
            valid: false,
            error: 'OTP has expired or does not exist. Please request a new one.'
        };
    }

    if (providedOtp !== storedOtp) {
        return {
            valid: false,
            error: 'Invalid OTP'
        };
    }

    return {
        valid: true,
        error: null
    };
};

/**
 * Checks if OTP sending should be skipped (dev mode).
 */
const shouldSkipSend = () => {
    return otpConfig.skipSend;
};

module.exports = {
    generateOtp,
    generateLoginToken,
    saveOtp,
    getOtp,
    deleteOtp,
    verifyOtp,
    shouldSkipSend
};
