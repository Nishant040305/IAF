/**
 * Admin Recovery Controller
 * 
 * Handles password recovery via security questions for admins.
 * 
 * @module controllers/adminRecovery.controller
 */

const { AdminRepository } = require('../repositories');
const { hashSecurityAnswers, verifySecurityAnswers, AVAILABLE_QUESTIONS } = require('../services/securityQuestion.service');
const { generateOtp, generateLoginToken, saveOtp, shouldSkipSend, verifyOtp } = require('../services/otp.service');
const { sendOtpSms } = require('../services/sms.service');
const { hashPassword } = require('../services/password.service');
const { generateAdminToken } = require('../services/jwt.service');
const { createSession, revokeAllSessions, SESSION_TYPES } = require('../services/session.service');
const { validateDpopPublicJwk } = require('../services/dpop.service');
const { logUpdate, RESOURCE_TYPES } = require('../services/audit.service');
const response = require('../utils/response');
const { sanitizePhone } = require('../utils/sanitize');
const { server, dpop: dpopConfig } = require('../config/environment');

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
 * Setup security questions for current admin.
 * Admin must be authenticated via OTP first.
 * Required for admins with isVerified = false.
 */
const setupSecurityQuestions = async (req, res, next) => {
    try {
        const adminId = req.admin?.adminId;
        const { securityQuestions } = req.body;

        if (!adminId) return response.unauthorized(res, 'Authentication required 1');

        if (!Array.isArray(securityQuestions) || securityQuestions.length < 3) {
            return response.badRequest(res, 'At least 3 security questions are required');
        }

        if (securityQuestions.length > 5) {
            return response.badRequest(res, 'Maximum 5 security questions allowed');
        }

        for (const qa of securityQuestions) {
            if (!qa.question || !qa.answer) {
                return response.badRequest(res, 'Each security question must have a question and answer');
            }
            if (qa.answer.trim().length < 2) {
                return response.badRequest(res, 'Each answer must be at least 2 characters');
            }
        }

        const admin = await AdminRepository.findById(adminId);
        if (!admin) {
            return response.notFound(res, 'Admin not found');
        }

        const hashedQuestions = await hashSecurityAnswers(securityQuestions);

        await AdminRepository.updateById(adminId, {
            securityQuestions: JSON.stringify(hashedQuestions),
            isVerified: true
        });

        await logUpdate(RESOURCE_TYPES.ADMIN, adminId, req.admin, {
            message: 'Security questions set/updated'
        });

        response.success(res, {
            message: 'Security questions set successfully',
            isVerified: true
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Initiate password recovery.
 * Returns the admin's security questions (without answers).
 */
const initiateRecovery = async (req, res, next) => {
    try {
        const contact = sanitizePhone(req.body.contact);

        if (!contact) {
            return response.badRequest(res, 'Contact number is required');
        }

        const admin = await AdminRepository.findByContact(contact);

        if (!admin) {
            // Don't reveal if admin exists
            return response.badRequest(res, 'Unable to initiate recovery for this contact');
        }

        const adminQuestions = admin.securityQuestions || admin.security_questions || [];
        const questions = typeof adminQuestions === 'string' ? JSON.parse(adminQuestions) : adminQuestions;

        if (!questions.length) {
            return response.badRequest(res, 'No security questions set for this account. Contact an admin.');
        }

        const questionsOnly = questions.map(q => q.question);

        response.success(res, {
            questions: questionsOnly,
            message: 'Please answer your security questions'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verify security question answers.
 * If correct, sends OTP to the admin's contact.
 */
const verifyRecoveryAnswers = async (req, res, next) => {
    try {
        const contact = sanitizePhone(req.body.contact);
        const { answers } = req.body;

        if (!contact || !answers || !Array.isArray(answers)) {
            return response.badRequest(res, 'Contact and answers are required');
        }

        const admin = await AdminRepository.findByContact(contact);
        if (!admin) {
            return response.badRequest(res, 'Invalid contact');
        }

        const adminQuestions = admin.securityQuestions || admin.security_questions || [];
        const questions = typeof adminQuestions === 'string' ? JSON.parse(adminQuestions) : adminQuestions;

        if (!questions.length) {
            return response.badRequest(res, 'No security questions set');
        }

        const verification = await verifySecurityAnswers(answers, questions);

        if (!verification.valid) {
            return response.badRequest(res, verification.error || 'Security answers are incorrect');
        }

        const loginToken = generateLoginToken();
        const otp = generateOtp();

        await saveOtp(contact, otp, loginToken, `recovery-${contact}`);

        sendOtpSms(contact, otp).catch(err => {
            console.error(`[SMS Error] Admin recovery OTP failed for ${contact}:`, err.message);
        });

        const isDevMode = shouldSkipSend();

        const responseData = {
            message: isDevMode
                ? 'Security answers verified. OTP generated (DEV MODE)'
                : 'Security answers verified. OTP sent to your phone',
            loginToken
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
 * Step 3: Verify OTP and Reset Password.
 */
const resetPassword = async (req, res, next) => {
    try {
        const contact = sanitizePhone(req.body.contact);
        const { otp, loginToken, newPassword, dpopPublicKey } = req.body;

        if (!contact || !otp || !loginToken || !newPassword) {
            return response.badRequest(res, 'All fields are required');
        }

        if (newPassword.length < 8) {
            return response.badRequest(res, 'Password must be at least 8 characters long');
        }

        if (newPassword.length > 100) {
            return response.badRequest(res, 'Password must be at most 100 characters long');
        }

        let dpopJkt = null;
        if (dpopConfig.enabled) {
            const dpopKeyCheck = validateDpopPublicJwk(dpopPublicKey);
            if (!dpopKeyCheck.valid) {
                return response.badRequest(res, dpopKeyCheck.error);
            }
            dpopJkt = dpopKeyCheck.jkt;
        }

        const admin = await AdminRepository.findByContact(contact);
        if (!admin) {
            return response.badRequest(res, 'Invalid contact');
        }

        const verification = await verifyOtp(otp, contact, loginToken, `recovery-${contact}`);

        if (!verification.valid) {
            return response.badRequest(res, verification.error || 'Invalid or expired OTP');
        }

        const newTokenVersion = (admin.tokenVersion || admin.token_version || 0) + 1;

        await AdminRepository.updateById(admin._id, {
            passwordHash: await hashPassword(newPassword),
            tokenVersion: newTokenVersion,
            isVerified: true
        });

        await logUpdate(RESOURCE_TYPES.ADMIN, admin._id,
            { id: admin._id, name: admin.name, contact: admin.contact },
            { message: 'Password reset via account recovery' }
        );

        try {
            await revokeAllSessions(SESSION_TYPES.ADMIN, admin._id);
        } catch (sessionError) {
            console.warn('Failed to revoke admin sessions during recovery reset:', sessionError.message);
        }

        const { sid } = await createSession({
            type: SESSION_TYPES.ADMIN,
            accountId: admin._id,
            tokenVersion: newTokenVersion
        });

        const tokenPayload = { sid };
        if (dpopJkt) {
            tokenPayload.cnf = { jkt: dpopJkt };
        }
        const token = generateAdminToken(admin, tokenPayload);

        const isProduction = process.env.NODE_ENV === 'production';
        const isTesting = server.isTesting;
        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: isProduction || isTesting,
            sameSite: isTesting ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        });

        response.success(res, {
            admin: AdminRepository.toSafeObject(admin),
            token,
            message: 'Password reset successful'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getQuestions,
    setupSecurityQuestions,
    initiateRecovery,
    verifyRecoveryAnswers,
    resetPassword
};
