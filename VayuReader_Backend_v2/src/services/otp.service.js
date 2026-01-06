const crypto = require('crypto');
const { otp: otpConfig, jwt: jwtConfig } = require('../config/environment');
const { redisClient } = require('../config/redis');

// Prefix for Redis keys
const KEY_PREFIX = 'vayureader-otp:';

/**
 * Internal helper to derive a 32-byte encryption key from the JWT secret.
 */
const getEncryptionKey = () => {
    return crypto.createHash('sha256').update(jwtConfig.secret).digest();
};

/**
 * Encrypts a string using AES-256-GCM.
 * @param {string} text 
 * @returns {string} iv:authTag:encrypted (base64)
 */
const encrypt = (text) => {
    const iv = crypto.randomBytes(12);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag().toString('base64');

    return `${iv.toString('base64')}:${authTag}:${encrypted}`;
};

/**
 * Decrypts a string using AES-256-GCM.
 * @param {string} encryptedData iv:authTag:encrypted
 * @returns {string|null} decrypted text or null on failure
 */
const decrypt = (encryptedData) => {
    try {
        const [ivBase64, authTagBase64, encryptedBase64] = encryptedData.split(':');

        const iv = Buffer.from(ivBase64, 'base64');
        const authTag = Buffer.from(authTagBase64, 'base64');
        const key = getEncryptionKey();

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
 * 
 * @param {string} identifier - unique key (e.g., phone or admin id)
 * @param {string} otp - OTP code (plain text)
 * @returns {Promise<void>}
 */
const saveOtp = async (identifier, otp) => {
    const key = `${KEY_PREFIX}${identifier}`;
    const encryptedOtp = encrypt(otp);
    const ttlSeconds = otpConfig.expiryMinutes * 60;
    await redisClient.set(key, encryptedOtp, {
        EX: ttlSeconds
    });
};

/**
 * Retrieves and DECRYPTS OTP from Redis.
 */
const getOtp = async (identifier) => {
    const key = `${KEY_PREFIX}${identifier}`;
    const encryptedData = await redisClient.get(key);

    if (!encryptedData) return null;

    return decrypt(encryptedData);
};

/**
 * Deletes OTP from Redis.
 */
const deleteOtp = async (identifier) => {
    const key = `${KEY_PREFIX}${identifier}`;
    await redisClient.del(key);
};

/**
 * Verifies an OTP code against Redis value.
 */
const verifyOtp = async (providedOtp, identifier) => {
    const storedOtp = await getOtp(identifier);

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
    saveOtp,
    getOtp,
    deleteOtp,
    verifyOtp,
    shouldSkipSend
};
