/**
 * Authentication Controller
 * 
 * Handles user authentication business logic.
 * 
 * @module controllers/auth.controller
 */

const User = require('../models/User');
const { generateLifetimeUserToken } = require('../services/jwt.service');
const { generateOtp, saveOtp, verifyOtp, deleteOtp, shouldSkipSend } = require('../services/otp.service');
const { sendOtpSms } = require('../services/sms.service');
const { logLogin, logDeviceChange } = require('../services/userAudit.service');
const response = require('../utils/response');
const { sanitizePhone, sanitizeName } = require('../utils/sanitize');

/**
 * Request OTP for user login.
 * Creates user if doesn't exist.
 * Requires deviceId for device-bound OTP encryption.
 */
const requestLoginOtp = async (req, res, next) => {
    try {
        const phoneNumber = sanitizePhone(req.body.phone_number);
        const name = sanitizeName(req.body.name);
        const { deviceId } = req.body;

        // Validate deviceId is provided
        if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
            return response.badRequest(res, 'Device ID is required');
        }

        const sanitizedDeviceId = deviceId.trim();

        // Find or create user
        let user = await User.findOne({ phone_number: phoneNumber });

        if (!user) {
            user = new User({ name, phone_number: phoneNumber });
        } else {
            if (user.isBlocked) {
                return response.unauthorized(res, 'Your account has been blocked. Please contact support.');
            }
            if (name && user.name !== name) {
                user.name = name;
            }
        }

        // Generate and save OTP to Redis (encrypted with deviceId)
        const otp = generateOtp();
        await saveOtp(phoneNumber, otp, sanitizedDeviceId);

        // Save user (for name updates/creation)
        await user.save();

        // Send OTP via SMS (Asynchronously)
        sendOtpSms(phoneNumber, otp).catch(err => {
            console.error(`[SMS Error] Background sending failed for ${phoneNumber}:`, err.message);
        });

        const isDevMode = shouldSkipSend();

        // Response
        const responseData = {
            message: isDevMode
                ? 'OTP generated (DEV MODE - SMS skipped)'
                : 'OTP request received'
        };

        // Include OTP in dev mode for testing
        if (isDevMode) {
            responseData.otp = otp;
        }

        response.success(res, responseData);
    } catch (error) {
        next(error);
    }
};

/**
 * Verify OTP and complete login.
 * Handles device binding and change detection.
 */
const verifyLoginOtp = async (req, res, next) => {
    try {
        const phoneNumber = sanitizePhone(req.body.phone_number);
        const { otp, deviceId } = req.body;

        // Validate deviceId is provided
        if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
            return response.badRequest(res, 'Device ID is required');
        }

        const sanitizedDeviceId = deviceId.trim();

        // Find user
        const user = await User.findOne({ phone_number: phoneNumber });

        if (!user) {
            return response.badRequest(res, 'User not found. Please request OTP first.');
        }

        if (user.isBlocked) {
            return response.unauthorized(res, 'Your account has been blocked. Please contact support.');
        }

        // Verify OTP from Redis (decrypted using deviceId)
        const verification = await verifyOtp(otp, phoneNumber, sanitizedDeviceId);

        if (!verification.valid) {
            return response.badRequest(res, verification.error);
        }

        // Clear OTP from Redis
        await deleteOtp(phoneNumber);

        // Handle device binding and change detection
        const isNewUser = !user.deviceId;
        const isDeviceChange = user.deviceId && user.deviceId !== sanitizedDeviceId;

        if (isDeviceChange) {
            // Log device change with both old and new device IDs
            logDeviceChange(user, user.deviceId, sanitizedDeviceId);

            // Store the previous device ID for audit trail
            user.previousDeviceId = user.deviceId;
        }

        // Update user's device ID and last login
        user.deviceId = sanitizedDeviceId;
        user.lastLogin = new Date();
        await user.save();

        // Log login event
        logLogin(user, sanitizedDeviceId);

        // Generate lifetime JWT token with user details
        const token = generateLifetimeUserToken(user._id, {
            deviceId: sanitizedDeviceId,
            phone_number: user.phone_number,
            name: user.name
        });

        // Set HTTP-only cookie with long expiration
        const isTesting = process.env.TESTING === 'true';
        const oneHundredYearsMs = 100 * 365 * 24 * 60 * 60 * 1000;

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: isTesting ? 'none' : 'lax',
            maxAge: oneHundredYearsMs,
            path: '/'
        });

        response.success(res, {
            user: user.toSafeObject(),
            token,
            isNewDevice: isNewUser,
            deviceChanged: isDeviceChange
        }, isDeviceChange ? 'Login successful (device changed)' : 'Login successful');
    } catch (error) {
        next(error);
    }
};

/**
 * Logout user.
 * Clears the auth cookie.
 */
const logout = async (req, res, next) => {
    try {
        const isTesting = process.env.TESTING === 'true';
        res.cookie('auth_token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: isTesting ? 'none' : 'lax',
            maxAge: 0,
            path: '/'
        });

        response.success(res, null, 'Logged out successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get current user's profile.
 */
const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return response.notFound(res, 'User not found');
        }

        response.success(res, { user: user.toSafeObject() });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    requestLoginOtp,
    verifyLoginOtp,
    getProfile,
    logout
};
