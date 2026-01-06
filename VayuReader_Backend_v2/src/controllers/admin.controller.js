/**
 * Admin Controller
 * 
 * Handles admin authentication and sub-admin management business logic.
 * 
 * @module controllers/admin.controller
 */

const Admin = require('../models/Admin');
const { generateAdminToken } = require('../services/jwt.service');
const { generateOtp, saveOtp, verifyOtp, deleteOtp, shouldSkipSend } = require('../services/otp.service');
const { sendOtpSms } = require('../services/sms.service');
const { logAction, RESOURCE_TYPES, ACTION_TYPES } = require('../services/audit.service');
const response = require('../utils/response');
const { sanitizePhone, sanitizeName } = require('../utils/sanitize');

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Request OTP for admin login.
 */
const requestLoginOtp = async (req, res, next) => {
    try {
        const name = sanitizeName(req.body.name);
        const contact = sanitizePhone(req.body.contact);

        // Find admin by name and contact
        const admin = await Admin.findOne({ name, contact });

        if (!admin) {
            return response.unauthorized(res, 'Invalid credentials');
        }

        // Generate and save OTP to Redis
        const otp = generateOtp();
        await saveOtp(contact, otp);

        // Send OTP via SMS (Asynchronously)
        sendOtpSms(contact, otp).catch(err => {
            console.error(`[SMS Error] Background sending failed for admin ${contact}:`, err.message);
        });

        const isDevMode = shouldSkipSend();

        const responseData = {
            message: isDevMode
                ? 'OTP generated (DEV MODE - SMS skipped)'
                : 'OTP request received'
        };

        if (isDevMode) {
            responseData.otp = otp;
        }

        response.success(res, responseData);
    } catch (error) {
        next(error);
    }
};

/**
 * Verify OTP and complete admin login.
 */
const verifyLoginOtp = async (req, res, next) => {
    try {
        const name = sanitizeName(req.body.name);
        const contact = sanitizePhone(req.body.contact);
        const { otp } = req.body;

        const admin = await Admin.findOne({ name, contact });

        if (!admin) {
            return response.unauthorized(res, 'Invalid credentials');
        }

        // Verify OTP from Redis
        const verification = await verifyOtp(otp, contact);

        if (!verification.valid) {
            return response.badRequest(res, verification.error);
        }

        // Clear OTP from Redis
        await deleteOtp(contact);

        const token = generateAdminToken(admin);

        response.success(res, {
            token,
            admin: admin.toSafeObject()
        }, 'Login successful');
    } catch (error) {
        next(error);
    }
};

// =============================================================================
// SUB-ADMIN MANAGEMENT
// =============================================================================

/**
 * Get all sub-admins.
 */
const getAllSubAdmins = async (req, res, next) => {
    try {
        const admins = await Admin.find({ isSuperAdmin: false })
            .sort({ createdAt: -1 })
            .select('-otpCode -otpExpiresAt');

        response.success(res, admins);
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new sub-admin.
 */
const createSubAdmin = async (req, res, next) => {
    try {
        const { name, contact, permissions } = req.body;
        const normalizedContact = sanitizePhone(contact);

        // Check for existing admin
        const existing = await Admin.findOne({ contact: normalizedContact });
        if (existing) {
            return response.conflict(res, 'Admin with this contact already exists');
        }

        // Validate permissions
        const validPermissions = permissions && Array.isArray(permissions)
            ? permissions.filter(p => Admin.PERMISSIONS.includes(p))
            : [];

        const newAdmin = new Admin({
            name: sanitizeName(name),
            contact: normalizedContact,
            isSuperAdmin: false,
            permissions: validPermissions,
            createdBy: req.admin.name
        });

        await newAdmin.save();

        await logAction(
            ACTION_TYPES.CREATE,
            RESOURCE_TYPES.ADMIN,
            newAdmin._id,
            req.admin,
            { name: newAdmin.name }
        );

        response.created(res, newAdmin.toSafeObject(), 'Sub-admin created successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a sub-admin.
 */
const deleteSubAdmin = async (req, res, next) => {
    try {
        const admin = await Admin.findById(req.params.id);

        if (!admin) {
            return response.notFound(res, 'Sub-admin not found');
        }

        if (admin.isSuperAdmin) {
            return response.forbidden(res, 'Cannot delete super admin');
        }

        await Admin.findByIdAndDelete(req.params.id);

        await logAction(
            ACTION_TYPES.DELETE,
            RESOURCE_TYPES.ADMIN,
            req.params.id,
            req.admin,
            { name: admin.name }
        );

        response.success(res, null, 'Sub-admin deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    requestLoginOtp,
    verifyLoginOtp,
    getAllSubAdmins,
    createSubAdmin,
    deleteSubAdmin
};
