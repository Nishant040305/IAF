/**
 * Admin Routes
 * 
 * Defines routes for admin authentication and sub-admin management.
 * Business logic is in admin.controller.js.
 * 
 * @module routes/admin.routes
 */

const express = require('express');
const router = express.Router();

// Controller
const adminController = require('../controllers/admin.controller');

// Middleware
const { otpLimiter, loginLimiter } = require('../middleware/rateLimiter');
const { authenticateAdmin, requireSuperAdmin } = require('../middleware/adminAuth');
const { requireFields, validateObjectId, trimFields } = require('../middleware/validate');

// =============================================================================
// AUTHENTICATION ROUTES (Password + OTP 2FA)
// =============================================================================

/**
 * POST /api/admin/login/request-otp
 * Step 1: Verify password and send OTP.
 */
router.post(
    '/login/request-otp',
    otpLimiter,
    trimFields,
    requireFields(['contact', 'password']),
    adminController.requestLoginOtp
);

/**
 * POST /api/admin/login/verify-otp
 * Step 2: Verify OTP and complete login.
 */
router.post(
    '/login/verify-otp',
    loginLimiter,
    trimFields,
    requireFields(['contact', 'otp', 'loginToken']),
    adminController.verifyLoginOtp
);

/**
 * GET /api/admin/me
 * Get current authenticated admin info (for session validation).
 */
router.get('/me', authenticateAdmin, adminController.getCurrentAdmin);

/**
 * POST /api/admin/logout
 * Logout and clear cookie.
 */
router.post('/logout', adminController.logout);

// =============================================================================
// SUB-ADMIN MANAGEMENT ROUTES (Super Admin Only)
// =============================================================================

/**
 * GET /api/admin/sub-admins
 * Get all sub-admins.
 */
router.get(
    '/sub-admins',
    authenticateAdmin,
    requireSuperAdmin,
    adminController.getAllSubAdmins
);

/**
 * POST /api/admin/sub-admins
 * Create a new sub-admin.
 */
router.post(
    '/sub-admins',
    authenticateAdmin,
    requireSuperAdmin,
    trimFields,
    requireFields(['name', 'contact']),
    adminController.createSubAdmin
);

/**
 * DELETE /api/admin/sub-admins/:id
 * Delete a sub-admin.
 */
router.delete(
    '/sub-admins/:id',
    authenticateAdmin,
    requireSuperAdmin,
    validateObjectId,
    adminController.deleteSubAdmin
);

module.exports = router;
