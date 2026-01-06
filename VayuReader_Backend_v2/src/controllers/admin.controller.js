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
const { hashPassword, comparePassword } = require('../services/password.service');
const { logAction, RESOURCE_TYPES, ACTION_TYPES } = require('../services/audit.service');
const response = require('../utils/response');
const { sanitizePhone, sanitizeName } = require('../utils/sanitize');

// =============================================================================
// AUTHENTICATION (Password + OTP 2FA)
// =============================================================================

/**
 * Step 1: Verify password and send OTP.
 * Requires: contact (phone) + password
 * Returns: Success message (OTP sent to phone)
 */
const requestLoginOtp = async (req, res, next) => {
    try {
        const contact = sanitizePhone(req.body.contact);
        const { password } = req.body;

        if (!contact || !password) {
            return response.badRequest(res, 'Contact and password are required');
        }

        // Find admin by contact
        const admin = await Admin.findOne({ contact });

        if (!admin) {
            // Use generic message to prevent user enumeration
            return response.unauthorized(res, 'Invalid credentials');
        }

        // Verify password (Factor 1: Something you know)
        const isPasswordValid = await comparePassword(password, admin.passwordHash);

        if (!isPasswordValid) {
            return response.unauthorized(res, 'Invalid credentials');
        }

        // Password correct - Generate and send OTP (Factor 2: Something you have)
        const otp = generateOtp();
        await saveOtp(contact, otp);

        // Send OTP via SMS (Asynchronously)
        sendOtpSms(contact, otp).catch(err => {
            console.error(`[SMS Error] Background sending failed for admin ${contact}:`, err.message);
        });

        const isDevMode = shouldSkipSend();

        const responseData = {
            message: isDevMode
                ? 'Password verified. OTP generated (DEV MODE - SMS skipped)'
                : 'Password verified. OTP sent to your phone'
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
 * Step 2: Verify OTP and complete admin login.
 * Requires: contact (phone) + otp
 * Returns: JWT token + admin info
 */
const verifyLoginOtp = async (req, res, next) => {
    try {
        const contact = sanitizePhone(req.body.contact);
        const { otp } = req.body;

        if (!contact || !otp) {
            return response.badRequest(res, 'Contact and OTP are required');
        }

        const admin = await Admin.findOne({ contact });

        if (!admin) {
            return response.unauthorized(res, 'Invalid credentials');
        }

        // Verify OTP from Redis (Factor 2: Something you have)
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
 * Requires password for the new admin.
 */
const createSubAdmin = async (req, res, next) => {
    try {
        const { name, contact, permissions, password } = req.body;
        const normalizedContact = sanitizePhone(contact);

        if (!password || password.length < 8) {
            return response.badRequest(res, 'Password must be at least 8 characters');
        }

        // Check for existing admin
        const existing = await Admin.findOne({ contact: normalizedContact });
        if (existing) {
            return response.conflict(res, 'Admin with this contact already exists');
        }

        // Validate permissions
        const validPermissions = permissions && Array.isArray(permissions)
            ? permissions.filter(p => Admin.PERMISSIONS.includes(p))
            : [];

        // Hash password
        const passwordHash = await hashPassword(password);

        const newAdmin = new Admin({
            name: sanitizeName(name),
            contact: normalizedContact,
            isSuperAdmin: false,
            permissions: validPermissions,
            createdBy: req.admin.name,
            passwordHash
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
