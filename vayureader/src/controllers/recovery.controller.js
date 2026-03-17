/**
 * Recovery Controller
 * 
 * Handles user password recovery via security questions.
 * 
 * @module controllers/recovery.controller
 */

const { UserRepository } = require('../repositories');
const { generateLifetimeUserToken } = require('../services/jwt.service');
const { createSession, SESSION_TYPES } = require('../services/session.service');
const { verifySecurityAnswers, hashSecurityAnswers, AVAILABLE_QUESTIONS } = require('../services/securityQuestion.service');
const response = require('../utils/response');
const { sanitizePhone } = require('../utils/sanitize');
const { server } = require('../config/environment');

/**
 * Get available security questions.
 */
const getQuestions = async (req, res, next) => {
    try {
        response.success(res, { questions: AVAILABLE_QUESTIONS });
    } catch (error) {
        next(error);
    }
};

/**
 * Set up security questions for a user.
 * Can only be done once (when user has no security questions set).
 */
const setupSecurityQuestions = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const { securityQuestions } = req.body;

        if (!userId) return response.unauthorized(res, 'Authentication required');

        const user = await UserRepository.findById(userId);

        if (!user) return response.notFound(res, 'User not found');

        const existingQuestions = user.securityQuestions || user.security_questions || [];
        if (existingQuestions.length > 0) {
            return response.badRequest(res, 'Security questions already set');
        }

        if (!Array.isArray(securityQuestions) || securityQuestions.length < 2) {
            return response.badRequest(res, 'At least 2 security questions required');
        }

        // Validate each question has required fields
        for (const sq of securityQuestions) {
            if (!sq.question || !sq.answer) {
                return response.badRequest(res, 'Each security question must have a question and answer');
            }
        }

        const hashedQuestions = await hashSecurityAnswers(securityQuestions);
        await UserRepository.updateById(userId, {
            securityQuestions: JSON.stringify(hashedQuestions),
            isVerified: true
        });

        response.success(res, null, 'Security questions set successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Initiate account recovery by verifying phone number.
 */
const initiateRecovery = async (req, res, next) => {
    try {
        const phoneNumber = sanitizePhone(req.body.phone_number);

        const user = await UserRepository.findByPhone(phoneNumber);
        if (!user) {
            return response.notFound(res, 'No account found with this phone number');
        }

        const userQuestions = user.securityQuestions || user.security_questions || [];
        if (!userQuestions.length) {
            return response.badRequest(res, 'No security questions set for this account');
        }

        // Parse if stored as string
        const questions = typeof userQuestions === 'string' ? JSON.parse(userQuestions) : userQuestions;

        // Return questions without answers
        const questionsOnly = questions.map(sq => ({
            question: sq.question
        }));

        response.success(res, {
            phone_number: phoneNumber,
            securityQuestions: questionsOnly
        }, 'Please answer your security questions');
    } catch (error) {
        next(error);
    }
};

/**
 * Verify security answers and issue a new session token.
 */
const verifyRecovery = async (req, res, next) => {
    try {
        const phoneNumber = sanitizePhone(req.body.phone_number);
        const { answers, deviceId } = req.body;

        if (!answers || !Array.isArray(answers)) {
            return response.badRequest(res, 'Answers are required');
        }

        if (!deviceId) {
            return response.badRequest(res, 'Device ID is required');
        }

        const user = await UserRepository.findByPhone(phoneNumber);
        if (!user) {
            return response.notFound(res, 'User not found');
        }

        const userQuestions = user.securityQuestions || user.security_questions || [];
        const questions = typeof userQuestions === 'string' ? JSON.parse(userQuestions) : userQuestions;

        const isValid = await verifySecurityAnswers(questions, answers);
        if (!isValid) {
            return response.unauthorized(res, 'Incorrect security answers');
        }

        // Update device
        await UserRepository.updateById(user._id, { deviceId });

        const tokenVersion = user.tokenVersion || user.token_version || 0;
        const { sid } = await createSession({
            type: SESSION_TYPES.USER,
            accountId: user._id,
            tokenVersion
        });

        const tokenPayload = {
            sid,
            deviceId,
            phone_number: user.phone_number,
            name: user.name,
            tokenVersion
        };

        const token = generateLifetimeUserToken(user._id, tokenPayload);

        const isTesting = server.isTesting;
        const oneHundredYearsMs = 100 * 365 * 24 * 60 * 60 * 1000;

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' || isTesting,
            sameSite: isTesting ? 'none' : 'lax',
            maxAge: oneHundredYearsMs,
            path: '/'
        });

        response.success(res, {
            user: UserRepository.toSafeObject(user),
            token
        }, 'Account recovered successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    setupSecurityQuestions,
    initiateRecovery,
    getQuestions,
    verifyRecovery
};
