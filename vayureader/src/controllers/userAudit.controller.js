/**
 * User Audit Controller
 * 
 * Handles user audit log queries with filtering, pagination, and analytics.
 * 
 * @module controllers/userAudit.controller
 */

const { UserAuditRepository } = require('../repositories');
const response = require('../utils/response');
const { escapeRegex } = require('../utils/sanitize');

/**
 * Get user audit logs with optional filters.
 * Query params: action, phone, deviceId, startDate, endDate, page, limit
 */
const getUserAuditLogs = async (req, res, next) => {
    try {
        const { action, phone, deviceId, startDate, endDate } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;

        // Build filter
        const filter = {};
        if (action) filter.action = action;
        if (phone) filter.phone_number = { $regex: phone };
        if (deviceId) filter.deviceId = { $regex: deviceId };

        // Date range filter
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            UserAuditRepository.find(filter, {
                sort: { timestamp: -1 },
                skip,
                limit
            }),
            UserAuditRepository.count(filter)
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
 * Get user audit statistics (aggregations).
 */
const getUserAuditStats = async (req, res, next) => {
    try {
        const [byAction, loginsByDay, topUsers] = await Promise.all([
            UserAuditRepository.getStatsByAction(),
            UserAuditRepository.getLoginsByDay(30),
            UserAuditRepository.getTopUsers(10)
        ]);

        response.success(res, {
            byAction,
            loginsByDay,
            topUsers
        });
    } catch (error) {
        next(error);
    }
};

/* Get user specific audit logs */
const getUserAuditLogsById = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { action, deviceId, startDate, endDate } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;

        const filter = { userId };
        if (action) filter.action = action;
        if (deviceId) filter.deviceId = { $regex: escapeRegex(deviceId) };

        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            UserAuditRepository.find(filter, {
                sort: { timestamp: -1 },
                skip,
                limit
            }),
            UserAuditRepository.count(filter)
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
module.exports = {
    getUserAuditLogs,
    getUserAuditStats,
    getUserAuditLogsById
};
