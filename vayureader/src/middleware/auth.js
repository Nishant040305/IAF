/**
 * User Authentication Middleware
 * 
 * Verifies JWT tokens for regular users.
 * 
 * @module middleware/auth
 */

const { verifyToken } = require('../services/jwt.service');
const response = require('../utils/response');
const { UserRepository, AdminRepository } = require('../repositories');
const { validateSession, SESSION_TYPES } = require('../services/session.service');

/**
 * Authenticates a user via JWT token.
 * Expects token in Authorization header: "Bearer <token>"
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const authenticateUser = async (req, res, next) => {
    try {
        let token;

        // Prefer Authorization header (avoids stale cookie overriding fresh bearer token)
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Fallback to cookie
        else if (req.cookies && req.cookies.auth_token) {
            token = req.cookies.auth_token;
        }

        if (!token) {
            return response.unauthorized(res, 'No token provided');
        }

        const decoded = verifyToken(token);

        // Ensure it's a user token (not admin)
        if (decoded.type !== 'user') {
            return response.unauthorized(res, 'Invalid token type');
        }

        const decodedTokenVersion = Number.isInteger(decoded.tokenVersion) ? decoded.tokenVersion : 0;
        const sessionValidation = await validateSession({
            sid: decoded.sid,
            type: SESSION_TYPES.USER,
            accountId: decoded.userId,
            tokenVersion: decodedTokenVersion
        });
        if (!sessionValidation.valid) {
            return response.unauthorized(res, 'Session expired. Please login again.');
        }

        // Check if user is blocked or deleted
        const user = await UserRepository.findById(decoded.userId, {
            select: ['isBlocked', 'tokenVersion', 'isVerified']
        });
        if (!user) {
            return response.unauthorized(res, 'User no longer exists');
        }
        const isBlocked = user.isBlocked !== undefined ? user.isBlocked : user.is_blocked;
        if (isBlocked) {
            return response.unauthorized(res, 'User is blocked');
        }

        // Enforce security questions setup
        const isSetupPath = req.path === '/security-setup' || req.path === '/api/recovery/setup' || req.path === '/setup';
        const isVerified = user.isVerified !== undefined ? user.isVerified : user.is_verified;
        if (!isVerified && !isSetupPath) {
            return response.forbidden(res, 'Security setup required');
        }

        const currentTokenVersion = user.tokenVersion || user.token_version || 0;
        if (decodedTokenVersion !== currentTokenVersion) {
            return response.unauthorized(res, 'Session expired. Please login again.');
        }

        // Attach user info to request (includes userId, phone_number, deviceId, name)
        req.user = {
            userId: decoded.userId,
            phone_number: decoded.phone_number,
            deviceId: decoded.deviceId,
            name: decoded.name,
            sid: decoded.sid,
            cnfJkt: decoded?.cnf?.jkt || null,
            tokenVersion: currentTokenVersion
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return response.unauthorized(res, 'Token expired');
        }
        // Handle database errors or invalid token errors
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
const optionalAuth = async (req, res, next) => {
    let token;

    // Prefer Authorization header (avoids stale cookie overriding fresh bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Fallback to cookie
    else if (req.cookies && req.cookies.auth_token) {
        token = req.cookies.auth_token;
    }

    if (!token) {
        return next(); // Continue without user
    }

    try {
        const decoded = verifyToken(token);
        const decodedTokenVersion = Number.isInteger(decoded.tokenVersion) ? decoded.tokenVersion : 0;

        if (decoded.type === 'user') {
            const sessionValidation = await validateSession({
                sid: decoded.sid,
                type: SESSION_TYPES.USER,
                accountId: decoded.userId,
                tokenVersion: decodedTokenVersion
            });
            if (!sessionValidation.valid) {
                return next();
            }

            // Validate user still exists and is not blocked
            const user = await UserRepository.findById(decoded.userId, {
                select: ['isBlocked', 'tokenVersion', 'isVerified']
            });
            const isBlocked = user ? (user.isBlocked !== undefined ? user.isBlocked : user.is_blocked) : true;
            if (user && !isBlocked) {
                const currentTokenVersion = user.tokenVersion || user.token_version || 0;
                if (decodedTokenVersion !== currentTokenVersion) {
                    return next();
                }

                req.user = {
                    userId: decoded.userId,
                    phone_number: decoded.phone_number,
                    deviceId: decoded.deviceId,
                    name: decoded.name,
                    sid: decoded.sid,
                    cnfJkt: decoded?.cnf?.jkt || null,
                    tokenVersion: currentTokenVersion
                };
            }
        } else if (decoded.type === 'admin') {
            const sessionValidation = await validateSession({
                sid: decoded.sid,
                type: SESSION_TYPES.ADMIN,
                accountId: decoded.adminId,
                tokenVersion: decodedTokenVersion
            });
            if (!sessionValidation.valid) {
                return next();
            }

            // Mirror admin validation used by strict middleware:
            // ensure admin exists and token session is still valid.
            const admin = await AdminRepository.findById(decoded.adminId, {
                select: ['name', 'contact', 'permissions', 'tokenVersion']
            });
            if (!admin) {
                return next();
            }

            const currentTokenVersion = admin.tokenVersion || admin.token_version || 0;
            if (decodedTokenVersion !== currentTokenVersion) {
                return next();
            }

            req.admin = {
                adminId: admin._id,
                name: admin.name,
                contact: admin.contact,
                permissions: admin.permissions || [],
                sid: decoded.sid,
                cnfJkt: decoded?.cnf?.jkt || null,
                tokenVersion: currentTokenVersion
            };
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
