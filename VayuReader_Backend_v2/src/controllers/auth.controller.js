/**
 * Authentication Controller
 * 
 * Handles user authentication business logic.
 * 
 * @module controllers/auth.controller
 */

const User = require('../models/User');
const { generateUserToken } = require('../services/jwt.service');
const { generateOtp, getOtpExpiry, verifyOtp } = require('../services/otp.service');
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

        // Find or create user
        let user = await User.findOne({ phone_number: phoneNumber });

        if (!user) {
            user = new User({ name, phone_number: phoneNumber });
        } else if (name && user.name !== name) {
            user.name = name;
        }

        // Generate and save OTP
        const otp = generateOtp();
        user.setOtp(otp, getOtpExpiry());
        await user.save();

        // Send OTP via SMS
        const smsResult = await sendOtpSms(phoneNumber, otp);

        if (!smsResult.success && !smsResult.devMode) {
            return response.error(res, 'Failed to send OTP', 502);
        }

        // Response
        const responseData = {
            message: smsResult.devMode
                ? 'OTP generated (DEV MODE - SMS skipped)'
                : 'OTP sent successfully'
        };

        // Include OTP in dev mode for testing
        if (smsResult.devMode && smsResult.otp) {
            responseData.otp = smsResult.otp;
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
        const { otp } = req.body;

        // Find user with OTP fields
        const user = await User.findOne({ phone_number: phoneNumber })
            .select('+otpCode +otpExpiresAt');

        if (!user) {
            return response.badRequest(res, 'User not found. Please request OTP first.');
        }

        // Verify OTP
        const verification = verifyOtp(otp, user.otpCode, user.otpExpiresAt);

        if (!verification.valid) {
            return response.badRequest(res, verification.error);
        }

        // Clear OTP and save
        user.clearOtp();
        await user.save();

        // Generate JWT token
        const token = generateUserToken(user._id);

        response.success(res, {
            token,
            user: user.toSafeObject()
        }, 'Login successful');
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
    getProfile
};
