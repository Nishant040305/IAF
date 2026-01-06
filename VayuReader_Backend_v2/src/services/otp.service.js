/**
 * OTP Service
 * 
 * Handles OTP generation, storage, and verification.
 * 
 * @module services/otp.service
 */

const crypto = require('crypto');
const { otp: otpConfig } = require('../config/environment');

/**
 * Generates a 6-digit OTP code.
 * Uses crypto.randomInt for cryptographic security.
 * 
 * @returns {string} 6-digit OTP code
 */
const generateOtp = () => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Calculates OTP expiry time.
 * 
 * @returns {Date} Expiry timestamp
 */
const getOtpExpiry = () => {
    return new Date(Date.now() + otpConfig.expiryMinutes * 60 * 1000);
};

/**
 * Verifies an OTP code against stored values.
 * 
 * @param {string} providedOtp - OTP provided by user
 * @param {string} storedOtp - OTP stored in database
 * @param {Date} expiresAt - Expiry timestamp
 * @returns {{valid: boolean, error: string|null}}
 */
const verifyOtp = (providedOtp, storedOtp, expiresAt) => {
    if (!storedOtp || !expiresAt) {
        return {
            valid: false,
            error: 'No active OTP. Please request a new one.'
        };
    }

    if (new Date() > new Date(expiresAt)) {
        return {
            valid: false,
            error: 'OTP has expired. Please request a new one.'
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
 * 
 * @returns {boolean}
 */
const shouldSkipSend = () => {
    return otpConfig.skipSend;
};

module.exports = {
    generateOtp,
    getOtpExpiry,
    verifyOtp,
    shouldSkipSend
};
