/**
 * User Audit Repository (ClickHouse)
 * 
 * Handles user activity log storage and retrieval.
 * 
 * @module repositories/clickhouse/UserAuditRepository
 */

const { getClickHouseClient } = require('../../db/clickhouse');
const { v4: uuidv4 } = require('uuid');

/**
 * User action types that can be audited.
 */
const USER_ACTIONS = {
    LOGIN: 'LOGIN',
    DEVICE_CHANGE: 'DEVICE_CHANGE',
    NAME_CHANGE: 'NAME_CHANGE',
    READ_PDF: 'READ_PDF'
};

class UserAuditRepository {
    get client() {
        return getClickHouseClient();
    }

    /**
     * Insert a single user audit log entry.
     */
    async create(data) {
        const entry = {
            id: uuidv4(),
            user_id: String(data.userId || ''),
            phone_number: data.phone_number || data.phoneNumber || '',
            action: data.action,
            device_id: data.deviceId || '',
            metadata: typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata || {}),
            timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString(),
            created_at: new Date().toISOString()
        };

        await this.client.insert({
            table: 'user_audit_logs',
            values: [entry],
            format: 'JSONEachRow'
        });

        return { ...entry, _id: entry.id };
    }

    /**
     * Query user audit logs with filters, pagination, and sorting.
     */
    async find(filter = {}, options = {}) {
        const { conditions, params } = this._buildWhere(filter);
        const orderBy = 'ORDER BY timestamp DESC';
        const limit = options.limit || 50;
        const offset = options.skip || 0;

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await this.client.query({
            query: `SELECT * FROM user_audit_logs ${whereClause} ${orderBy} LIMIT {limit:UInt32} OFFSET {offset:UInt32}`,
            query_params: { ...params, limit, offset },
            format: 'JSONEachRow'
        });

        const rows = await result.json();
        return rows.map(r => this._toJS(r));
    }

    /**
     * Count user audit log entries matching filter.
     */
    async count(filter = {}) {
        const { conditions, params } = this._buildWhere(filter);
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await this.client.query({
            query: `SELECT count() AS count FROM user_audit_logs ${whereClause}`,
            query_params: params,
            format: 'JSONEachRow'
        });

        const rows = await result.json();
        return parseInt(rows[0]?.count || 0, 10);
    }

    /**
     * Delete user audit logs older than cutoff date.
     */
    async deleteOlderThan(cutoffDate) {
        await this.client.command({
            query: `ALTER TABLE user_audit_logs DELETE WHERE timestamp < '${cutoffDate.toISOString()}'`
        });
    }

    /**
     * Group user audit logs by action type.
     */
    async getStatsByAction() {
        const result = await this.client.query({
            query: `
                SELECT action AS _id, count() AS count
                FROM user_audit_logs
                GROUP BY action
                ORDER BY count DESC
            `,
            format: 'JSONEachRow'
        });
        const rows = await result.json();
        return rows.map(r => ({ _id: r._id, count: parseInt(r.count, 10) }));
    }

    /**
     * Get login counts per day for the last N days.
     */
    async getLoginsByDay(days = 30) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const result = await this.client.query({
            query: `
                SELECT 
                    formatDateTime(timestamp, '%Y-%m-%d') AS _id,
                    count() AS count
                FROM user_audit_logs
                WHERE action = 'LOGIN' AND timestamp >= {since:String}
                GROUP BY _id
                ORDER BY _id ASC
            `,
            query_params: { since },
            format: 'JSONEachRow'
        });
        const rows = await result.json();
        return rows.map(r => ({ _id: r._id, count: parseInt(r.count, 10) }));
    }

    /**
     * Get top users by activity count.
     */
    async getTopUsers(limit = 10) {
        const result = await this.client.query({
            query: `
                SELECT phone_number AS _id, count() AS count
                FROM user_audit_logs
                GROUP BY phone_number
                ORDER BY count DESC
                LIMIT {limit:UInt32}
            `,
            query_params: { limit },
            format: 'JSONEachRow'
        });
        const rows = await result.json();
        return rows.map(r => ({ _id: r._id, count: parseInt(r.count, 10) }));
    }

    // =====================================================================
    // PRIVATE HELPERS
    // =====================================================================

    _buildWhere(filter) {
        const conditions = [];
        const params = {};

        if (filter.action) {
            conditions.push(`action = {action:String}`);
            params.action = filter.action;
        }
        if (filter.phone_number || filter.phoneNumber) {
            const phone = filter.phone_number || filter.phoneNumber;
            if (typeof phone === 'object' && phone.$regex) {
                conditions.push(`phone_number ILIKE {phone:String}`);
                params.phone = `%${phone.$regex}%`;
            } else {
                conditions.push(`phone_number = {phone:String}`);
                params.phone = phone;
            }
        }
        if (filter.userId) {
            conditions.push(`user_id = {userId:String}`);
            params.userId = String(filter.userId);
        }
        if (filter.deviceId) {
            if (typeof filter.deviceId === 'object' && filter.deviceId.$regex) {
                conditions.push(`device_id ILIKE {deviceId:String}`);
                params.deviceId = `%${filter.deviceId.$regex}%`;
            } else {
                conditions.push(`device_id = {deviceId:String}`);
                params.deviceId = filter.deviceId;
            }
        }
        if (filter.timestamp) {
            if (filter.timestamp.$gte) {
                conditions.push(`timestamp >= {tsGte:String}`);
                params.tsGte = new Date(filter.timestamp.$gte).toISOString();
            }
            if (filter.timestamp.$lte) {
                conditions.push(`timestamp <= {tsLte:String}`);
                params.tsLte = new Date(filter.timestamp.$lte).toISOString();
            }
            if (filter.timestamp.$lt) {
                conditions.push(`timestamp < {tsLt:String}`);
                params.tsLt = new Date(filter.timestamp.$lt).toISOString();
            }
        }

        return { conditions, params };
    }

    _toJS(row) {
        return {
            _id: row.id,
            id: row.id,
            userId: row.user_id,
            phone_number: row.phone_number,
            action: row.action,
            deviceId: row.device_id,
            metadata: (() => { try { return JSON.parse(row.metadata); } catch { return row.metadata; } })(),
            timestamp: row.timestamp,
            createdAt: row.created_at
        };
    }
}

const userAuditRepo = new UserAuditRepository();
userAuditRepo.USER_ACTIONS = USER_ACTIONS;

module.exports = userAuditRepo;
