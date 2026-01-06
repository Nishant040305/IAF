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
// AUTHENTICATION ROUTES
// =============================================================================

/**
 * POST /api/admin/login/request-otp
 * Request OTP for admin login.
 */
router.post(
    '/login/request-otp',
    otpLimiter,
    trimFields,
    requireFields(['name', 'contact']),
    adminController.requestLoginOtp
);

/**
 * POST /api/admin/login/verify-otp
 * Verify OTP and complete admin login.
 */
router.post(
    '/login/verify-otp',
    loginLimiter,
    trimFields,
    requireFields(['name', 'contact', 'otp']),
    adminController.verifyLoginOtp
);

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
