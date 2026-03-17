/**
 * Audit Controller
 * 
 * Handles admin audit log queries with filtering and pagination.
 * 
 * @module controllers/audit.controller
 */

const { AuditLogRepository } = require('../repositories');
const response = require('../utils/response');
const { escapeRegex } = require('../utils/sanitize');

/**
 * Get admin audit logs with optional filters.
 * Query params: action, resourceType, adminName, startDate, endDate, page, limit
 */
const getAuditLogs = async (req, res, next) => {
    try {
        const { action, resourceType, adminName, startDate, endDate } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;

        // Build filter
        const filter = {};
        if (action) filter.action = action;
        if (resourceType) filter.resourceType = resourceType;
        if (adminName) filter.adminName = adminName;

        // Date range filter
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            AuditLogRepository.find(filter, {
                sort: { timestamp: -1 },
                skip,
                limit
            }),
            AuditLogRepository.count(filter)
        ]);

        response.success(res, {
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get audit logs aggregated by resource type and action.
 */
const getAuditStats = async (req, res, next) => {
    try {
        const [byResourceType, topAdmins] = await Promise.all([
            AuditLogRepository.getStatsByResourceType(),
            AuditLogRepository.getTopAdmins(10)
        ]);

        response.success(res, {
            byResourceType,
            topAdmins
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAuditLogs,
    getAuditStats
};
