/**
 * JWT Service
 * 
 * Handles JWT token generation and verification.
 * 
 * @module services/jwt.service
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { jwt: jwtConfig } = require('../config/environment');

/**
 * Generates an opaque ID for session/token tracking.
 *
 * @param {number} [bytes=24] - Number of random bytes
 * @returns {string}
 */
const generateOpaqueId = (bytes = 24) => {
    return crypto.randomBytes(bytes).toString('base64url');
};

/**
 * Ensures session claims are present in every issued JWT.
 *
 * @param {Object} additionalPayload - Incoming payload
 * @returns {{sid: string, jti: string}}
 */
const resolveSessionClaims = (additionalPayload = {}) => {
    const sid = typeof additionalPayload.sid === 'string' && additionalPayload.sid
        ? additionalPayload.sid
        : generateOpaqueId(24);

    const jti = typeof additionalPayload.jti === 'string' && additionalPayload.jti
        ? additionalPayload.jti
        : generateOpaqueId(16);

    return { sid, jti };
};

/**
 * Generates a JWT token for a user.
 * 
 * @param {string} userId - MongoDB ObjectId of the user
 * @param {Object} [additionalPayload={}] - Additional data to include in token
 * @returns {string} JWT token
 */
const generateUserToken = (userId, additionalPayload = {}) => {
    const { sid, jti } = resolveSessionClaims(additionalPayload);
    const payload = {
        userId,
        type: 'user',
        sid,
        jti,
        ...additionalPayload
    };

    return jwt.sign(payload, jwtConfig.secret, {
        expiresIn: `${jwtConfig.expiryDays}d`
    });
};

/**
 * Generates a lifetime JWT token for a user (100 years).
 * Used for device-bound authentication.
 * 
 * @param {string} userId - MongoDB ObjectId of the user
 * @param {Object} [additionalPayload={}] - Additional data to include in token
 * @returns {string} JWT token
 */
const generateLifetimeUserToken = (userId, additionalPayload = {}) => {
    const { sid, jti } = resolveSessionClaims(additionalPayload);
    const payload = {
        userId,
        type: 'user',
        lifetime: true,
        sid,
        jti,
        ...additionalPayload
    };

    // Use configurable lifetime from env
    return jwt.sign(payload, jwtConfig.secret, {
        expiresIn: `${jwtConfig.lifetimeDays}d`
    });
};

/**
 * Generates a JWT token for an admin.
 * 
 * @param {Object} admin - Admin document
 * @returns {string} JWT token
 */
const generateAdminToken = (admin, additionalPayload = {}) => {
    const tokenVersion = Number.isInteger(admin?.tokenVersion) ? admin.tokenVersion : 0;
    const permissions = admin?.permissions || [];
    const { sid, jti } = resolveSessionClaims(additionalPayload);

    const payload = {
        adminId: admin._id,
        name: admin.name,
        contact: admin.contact,
        permissions,
        tokenVersion,
        sid,
        jti,
        type: 'admin',
        ...additionalPayload
    };

    return jwt.sign(payload, jwtConfig.secret, {
        expiresIn: `${jwtConfig.expiryDays}d`
    });
};

/**
 * Verifies a JWT token.
 * 
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
    return jwt.verify(token, jwtConfig.secret);
};

/**
 * Decodes a JWT token without verification.
 * Useful for debugging or reading expired tokens.
 * 
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded payload or null
 */
const decodeToken = (token) => {
    return jwt.decode(token);
};

module.exports = {
    generateUserToken,
    generateLifetimeUserToken,
    generateAdminToken,
    verifyToken,
    decodeToken
};
