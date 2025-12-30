const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
// Try to load auth service .env for user JWT secret
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'auth', '.env') });

// Load JWT secrets from both services
const ADMIN_JWT_SECRET = process.env.JWT_SECRET || 'admin-secret-key';
// Try to get user JWT secret from auth service .env or use default
// Priority: USER_JWT_SECRET env var > JWT_SECRET from auth/.env > default
const USER_JWT_SECRET = process.env.USER_JWT_SECRET || 
                        (process.env.JWT_SECRET && path.join(__dirname, '..', '..', 'auth').includes('auth') ? process.env.JWT_SECRET : null) ||
                        'change_me';

/**
 * Unified authentication middleware
 * - Verifies either admin token or user token
 * - Admins can access all routes (GET, POST, PUT, DELETE)
 * - Users (OTP login) can only access GET routes (read-only)
 */
const unifiedAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    let decoded = null;
    let isAdmin = false;
    let isUser = false;

    // Try to verify as admin token first
    try {
      decoded = jwt.verify(token, ADMIN_JWT_SECRET);
      // Check if it's an admin token (has name, contact, type, or isSuperAdmin)
      if (decoded.name || decoded.contact || decoded.type || decoded.isSuperAdmin !== undefined) {
        isAdmin = true;
        req.admin = decoded;
        req.userType = 'admin';
        return next(); // Admin can access all routes
      }
    } catch (adminError) {
      // Not an admin token, continue to check user token
    }

    // Try to verify as user token (OTP login)
    try {
      decoded = jwt.verify(token, USER_JWT_SECRET);
      // Check if it's a user token (has userId)
      if (decoded.userId) {
        isUser = true;
        req.user = { userId: decoded.userId };
        req.userType = 'user';
        
        // Check if it's a write operation (POST, PUT, DELETE, PATCH)
        const writeMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
        if (writeMethods.includes(req.method)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. Users can only access read operations (GET).'
          });
        }
        
        // User can access GET routes
        return next();
      }
    } catch (userError) {
      // Not a user token either
    }

    // If neither token type is valid
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
      error: error.message
    });
  }
};

/**
 * Admin-only middleware (for routes that require admin privileges)
 * Use this for routes that should only be accessible by admins
 */
const adminOnly = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    
    // Check if it's an admin token
    if (decoded.name || decoded.contact || decoded.type || decoded.isSuperAdmin !== undefined) {
      req.admin = decoded;
      req.userType = 'admin';
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired admin token.'
    });
  }
};

module.exports = { unifiedAuth, adminOnly };

