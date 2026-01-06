/**
 * Audit Service
 * 
 * Handles logging of administrative actions for accountability.
 * 
 * @module services/audit.service
 */

const AuditLog = require('../models/AuditLog');

/**
 * Resource types that can be audited.
 */
const RESOURCE_TYPES = {
    PDF: 'PDF',
    DICTIONARY: 'DICTIONARY_WORD',
    ABBREVIATION: 'ABBREVIATION',
    ADMIN: 'ADMIN'
};

/**
 * Action types that can be audited.
 */
const ACTION_TYPES = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE'
};

/**
 * Logs an administrative action.
 * Non-blocking: will not throw errors to avoid breaking main flow.
 * 
 * @param {string} action - Action type (CREATE, UPDATE, DELETE)
 * @param {string} resourceType - Type of resource affected
 * @param {string} resourceId - ID of the affected resource
 * @param {Object} admin - Admin who performed the action
 * @param {Object} [details={}] - Additional details about the action
 */
const logAction = async (action, resourceType, resourceId, admin, details = {}) => {
    try {
        const auditLog = new AuditLog({
            action,
            resourceType,
            resourceId: resourceId ? resourceId.toString() : 'unknown',
            adminId: admin?._id || admin?.adminId,
            adminName: admin?.name || 'Unknown',
            adminContact: admin?.contact || 'Unknown',
            details,
            timestamp: new Date()
        });

        await auditLog.save();

        console.log(`📝 Audit: ${action} ${resourceType} by ${admin?.name || 'Unknown'}`);
    } catch (error) {
        // Log error but don't throw - audit should not break main flow
        console.error('⚠️ Audit logging failed:', error.message);
    }
};

/**
 * Convenience functions for specific actions.
 */
const logCreate = (resourceType, resourceId, admin, details) => {
    return logAction(ACTION_TYPES.CREATE, resourceType, resourceId, admin, details);
};

const logUpdate = (resourceType, resourceId, admin, details) => {
    return logAction(ACTION_TYPES.UPDATE, resourceType, resourceId, admin, details);
};

const logDelete = (resourceType, resourceId, admin, details) => {
    return logAction(ACTION_TYPES.DELETE, resourceType, resourceId, admin, details);
};

module.exports = {
    RESOURCE_TYPES,
    ACTION_TYPES,
    logAction,
    logCreate,
    logUpdate,
    logDelete
};
