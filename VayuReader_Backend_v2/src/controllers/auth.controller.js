/**
 * Authentication Controller
 * 
 * Handles user authentication business logic.
 * 
 * @module controllers/auth.controller
 */

const User = require('../models/User');
const { generateUserToken } = require('../services/jwt.service');
const { generateOtp, saveOtp, verifyOtp, deleteOtp, shouldSkipSend } = require('../services/otp.service');
const { sendOtpSms } = require('../services/sms.service');
const response = require('../utils/response');
const { sanitizePhone, sanitizeName } = require('../utils/sanitize');

/**
 * Request OTP for user login.
 * Creates user if doesn't exist.
 */
const requestLoginOtp = async (req, res, next) => {
    try {
        const phoneNumber = sanitizePhone(req.body.phone_number);
        const name = sanitizeName(req.body.name);
        const { deviceId } = req.body;

        console.log(`[AUTH] OTP Request - Phone: ${phoneNumber}, Name: ${name}, DeviceID: ${deviceId}`);

        if (!deviceId) {
            return response.badRequest(res, 'Device ID is required');
        }

        // Find or create user
        let user = await User.findOne({ phone_number: phoneNumber });

        if (!user) {
            user = new User({ name, phone_number: phoneNumber, deviceId });
        } else {
            if (name && user.name !== name) user.name = name;
            // Optionally update deviceId on new OTP request if we allow device switching
            // For strict locking, we might want to prevent this if deviceId is already set
            user.deviceId = deviceId;
        }

        // Generate and save OTP to Redis
        const otp = generateOtp();
        await saveOtp(phoneNumber, otp, '', deviceId);

        // Save user (for name updates/creation/deviceId)
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
 */
const verifyLoginOtp = async (req, res, next) => {
    try {
        const phoneNumber = sanitizePhone(req.body.phone_number);
        const { otp, deviceId } = req.body;

        console.log(`[AUTH] OTP Verify - Phone: ${phoneNumber}, OTP: ${otp}, DeviceID: ${deviceId}`);

        if (!otp || !deviceId) {
            return response.badRequest(res, 'OTP and Device ID are required');
        }

        // Find user
        const user = await User.findOne({ phone_number: phoneNumber });

        if (!user) {
            return response.badRequest(res, 'User not found. Please request OTP first.');
        }

        // Verify OTP from Redis
        const verification = await verifyOtp(otp, phoneNumber, '', deviceId);

        if (!verification.valid) {
            return response.badRequest(res, verification.error);
        }

        // Clear OTP from Redis
        await deleteOtp(phoneNumber);

        // Generate JWT token
        const token = generateUserToken(user._id);

        // Set HTTP-only cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: '/'
        });

        response.success(res, {
            user: user.toSafeObject(),
            token
        }, 'Login successful');
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
        res.cookie('auth_token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
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
