/**
 * Admin Recovery Controller
 * 
 * Handles admin account recovery via security questions.
 * 
 * @module controllers/adminRecovery.controller
 */

const { AdminRepository } = require('../repositories');
const { generateAdminToken } = require('../services/jwt.service');
const { hashPassword, comparePassword } = require('../services/password.service');
const { verifySecurityAnswers, hashSecurityAnswers } = require('../services/securityQuestion.service');
const { createSession, SESSION_TYPES } = require('../services/session.service');
const { validateDpopPublicJwk } = require('../services/dpop.service');
const { logUpdate, RESOURCE_TYPES } = require('../services/audit.service');
const response = require('../utils/response');
const { sanitizePhone } = require('../utils/sanitize');
const { server, dpop: dpopConfig } = require('../config/environment');

/**
 * Set up security questions for an admin.
 * Requires authentication (admin must be logged in).
 * Marks admin as verified after setup.
 */
const setupSecurityQuestions = async (req, res, next) => {
    try {
        const adminId = req.admin?.adminId;
        const { securityQuestions } = req.body;

        if (!adminId) return response.unauthorized(res, 'Authentication required');

        const admin = await AdminRepository.findById(adminId);
        if (!admin) return response.notFound(res, 'Admin not found');

        const existingQuestions = admin.securityQuestions || admin.security_questions || [];
        if (existingQuestions.length > 0) {
            return response.badRequest(res, 'Security questions already set. Use recovery to change them.');
        }

        if (!Array.isArray(securityQuestions) || securityQuestions.length < 2) {
            return response.badRequest(res, 'At least 2 security questions required');
        }

        for (const sq of securityQuestions) {
            if (!sq.question || !sq.answer) {
                return response.badRequest(res, 'Each security question must have a question and answer');
            }
        }

        const hashedQuestions = await hashSecurityAnswers(securityQuestions);
        await AdminRepository.updateById(adminId, { 
            securityQuestions: JSON.stringify(hashedQuestions), 
            isVerified: true 
        });

        await logUpdate(RESOURCE_TYPES.ADMIN, adminId, req.admin, {
            action: 'SECURITY_SETUP',
            questionCount: securityQuestions.length
        });

        response.success(res, null, 'Security questions set successfully. Admin verified.');
    } catch (error) {
        next(error);
    }
};

/**
 * Initiate admin recovery - return security questions.
 */
const initiateRecovery = async (req, res, next) => {
    try {
        const contact = sanitizePhone(req.body.contact);

        const admin = await AdminRepository.findByContact(contact);
        if (!admin) {
            return response.notFound(res, 'No admin account found with this contact');
        }

        const adminQuestions = admin.securityQuestions || admin.security_questions || [];
        const questions = typeof adminQuestions === 'string' ? JSON.parse(adminQuestions) : adminQuestions;

        if (!questions.length) {
            return response.badRequest(res, 'No security questions set for this account. Contact super admin.');
        }

        const questionsOnly = questions.map(sq => ({
            question: sq.question
        }));

        response.success(res, {
            contact,
            securityQuestions: questionsOnly
        }, 'Please answer your security questions');
    } catch (error) {
        next(error);
    }
};

/**
 * Verify security answers and allow password reset.
 */
const verifyRecovery = async (req, res, next) => {
    try {
        const contact = sanitizePhone(req.body.contact);
        const { answers, newPassword, dpopPublicKey } = req.body;

        if (!answers || !Array.isArray(answers)) {
            return response.badRequest(res, 'Answers are required');
        }

        if (!newPassword || newPassword.length < 8) {
            return response.badRequest(res, 'New password must be at least 8 characters');
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
            return response.notFound(res, 'Admin not found');
        }

        const adminQuestions = admin.securityQuestions || admin.security_questions || [];
        const questions = typeof adminQuestions === 'string' ? JSON.parse(adminQuestions) : adminQuestions;

        const isValid = await verifySecurityAnswers(questions, answers);
        if (!isValid) {
            return response.unauthorized(res, 'Incorrect security answers');
        }

        // Reset password
        const passwordHash = await hashPassword(newPassword);
        await AdminRepository.updateById(admin._id, { passwordHash });

        const tokenVersion = admin.tokenVersion || admin.token_version || 0;
        const { sid } = await createSession({
            type: SESSION_TYPES.ADMIN,
            accountId: admin._id,
            tokenVersion
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

        await logUpdate(RESOURCE_TYPES.ADMIN, admin._id, { _id: admin._id, name: admin.name, contact: admin.contact }, {
            action: 'PASSWORD_RESET_VIA_RECOVERY'
        });

        response.success(res, {
            admin: AdminRepository.toSafeObject(admin),
            token
        }, 'Password reset successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Change password while authenticated.
 */
const changePassword = async (req, res, next) => {
    try {
        const adminId = req.admin?.adminId;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return response.badRequest(res, 'Current and new password required');
        }

        if (newPassword.length < 8) {
            return response.badRequest(res, 'New password must be at least 8 characters');
        }

        if (newPassword.length > 100) {
            return response.badRequest(res, 'Password must be at most 100 characters long');
        }

        const admin = await AdminRepository.findById(adminId);
        if (!admin) return response.notFound(res, 'Admin not found');

        const isValid = await comparePassword(currentPassword, admin.passwordHash || admin.password_hash);
        if (!isValid) {
            return response.unauthorized(res, 'Current password is incorrect');
        }

        const passwordHash = await hashPassword(newPassword);
        await AdminRepository.updateById(adminId, { passwordHash });

        await logUpdate(RESOURCE_TYPES.ADMIN, adminId, req.admin, {
            action: 'PASSWORD_CHANGE'
        });

        response.success(res, null, 'Password changed successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    setupSecurityQuestions,
    initiateRecovery,
    verifyRecovery,
    changePassword
};
