/**
 * User Authentication Middleware
 * 
 * Verifies JWT tokens for regular users.
 * 
 * @module middleware/auth
 */

const { verifyToken } = require('../services/jwt.service');
const response = require('../utils/response');

/**
 * Authenticates a user via JWT token.
 * Expects token in Authorization header: "Bearer <token>"
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const authenticateUser = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return response.unauthorized(res, 'No token provided');
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        // Ensure it's a user token (not admin)
        if (decoded.type !== 'user') {
            return response.unauthorized(res, 'Invalid token type');
        }

        // Attach user info to request
        req.user = {
            userId: decoded.userId
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return response.unauthorized(res, 'Token expired');
        }
        return response.unauthorized(res, 'Invalid token');
    }
};

/**
 * Optional authentication.
 * Doesn't reject if no token, but attaches user if valid token provided.
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); // Continue without user
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        if (decoded.type === 'user') {
            req.user = { userId: decoded.userId };
        } else if (decoded.type === 'admin') {
            req.admin = decoded;
        }
    } catch (error) {
        // Silently ignore invalid tokens for optional auth
    }

    next();
};

module.exports = {
    authenticateUser,
    optionalAuth
};
