/**
 * Audit Log Repository (ClickHouse)
 * 
 * Handles admin audit log storage and retrieval.
 * 
 * @module repositories/clickhouse/AuditLogRepository
 */

const { getClickHouseClient } = require('../../db/clickhouse');
const { v4: uuidv4 } = require('uuid');

class AuditLogRepository {
    get client() {
        return getClickHouseClient();
    }

    /**
     * Insert a single audit log entry.
     */
    async create(data) {
        const entry = {
            id: uuidv4(),
            action: data.action,
            resource_type: data.resourceType,
            resource_id: String(data.resourceId || ''),
            admin_id: String(data.adminId || ''),
            admin_name: data.adminName || 'Unknown',
            admin_contact: data.adminContact || 'Unknown',
            details: typeof data.details === 'string' ? data.details : JSON.stringify(data.details || {}),
            timestamp: this._toCHDateTime(new Date()),
            created_at: this._toCHDateTime(new Date())
        };

        await this.client.insert({
            table: 'audit_logs',
            values: [entry],
            format: 'JSONEachRow'
        });

        return { ...entry, _id: entry.id };
    }

    /**
     * Query audit logs with filters, pagination, and sorting.
     */
    async find(filter = {}, options = {}) {
        const { conditions, params } = this._buildWhere(filter);
        const orderBy = options.sort?.timestamp === -1 ? 'ORDER BY timestamp DESC' : 'ORDER BY timestamp DESC';
        const limit = options.limit || 50;
        const offset = options.skip || 0;

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await this.client.query({
            query: `SELECT * FROM audit_logs ${whereClause} ${orderBy} LIMIT {limit:UInt32} OFFSET {offset:UInt32}`,
            query_params: { ...params, limit, offset },
            format: 'JSONEachRow'
        });

        const rows = await result.json();
        return rows.map(r => this._toJS(r));
    }

    /**
     * Count audit log entries matching filter.
     */
    async count(filter = {}) {
        const { conditions, params } = this._buildWhere(filter);
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await this.client.query({
            query: `SELECT count() AS count FROM audit_logs ${whereClause}`,
            query_params: params,
            format: 'JSONEachRow'
        });

        const rows = await result.json();
        return parseInt(rows[0]?.count || 0, 10);
    }

    /**
     * Delete audit logs older than cutoff date.
     */
    async deleteOlderThan(cutoffDate) {
        await this.client.command({
            query: `ALTER TABLE audit_logs DELETE WHERE timestamp < '${cutoffDate.toISOString()}'`
        });
    }

    /**
     * Aggregate stats: group by resource type and action.
     */
    async getStatsByResourceType() {
        const result = await this.client.query({
            query: `
                SELECT 
                    resource_type,
                    action,
                    count() AS count
                FROM audit_logs
                GROUP BY resource_type, action
                ORDER BY resource_type, action
            `,
            format: 'JSONEachRow'
        });
        const rows = await result.json();

        // Transform to match the MongoDB aggregate format
        const grouped = {};
        for (const row of rows) {
            if (!grouped[row.resource_type]) {
                grouped[row.resource_type] = { _id: row.resource_type, actions: [], total: 0 };
            }
            const count = parseInt(row.count, 10);
            grouped[row.resource_type].actions.push({ action: row.action, count });
            grouped[row.resource_type].total += count;
        }
        return Object.values(grouped);
    }

    /**
     * Get top admins by action count.
     */
    async getTopAdmins(limit = 10) {
        const result = await this.client.query({
            query: `
                SELECT admin_name AS _id, count() AS count
                FROM audit_logs
                GROUP BY admin_name
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
        if (filter.resourceType) {
            conditions.push(`resource_type = {resourceType:String}`);
            params.resourceType = filter.resourceType;
        }
        if (filter.adminName) {
            conditions.push(`admin_name ILIKE {adminName:String}`);
            params.adminName = `%${filter.adminName}%`;
        }
        if (filter.timestamp) {
            if (filter.timestamp.$gte) {
                conditions.push(`timestamp >= {tsGte:String}`);
                params.tsGte = this._toCHDateTime(filter.timestamp.$gte);
            }
            if (filter.timestamp.$lte) {
                conditions.push(`timestamp <= {tsLte:String}`);
                params.tsLte = this._toCHDateTime(filter.timestamp.$lte);
            }
            if (filter.timestamp.$lt) {
                conditions.push(`timestamp < {tsLt:String}`);
                params.tsLt = this._toCHDateTime(filter.timestamp.$lt);
            }
        }

        return { conditions, params };
    }

    _toJS(row) {
        return {
            _id: row.id,
            id: row.id,
            action: row.action,
            resourceType: row.resource_type,
            resourceId: row.resource_id,
            adminId: row.admin_id,
            adminName: row.admin_name,
            adminContact: row.admin_contact,
            details: (() => { try { return JSON.parse(row.details); } catch { return row.details; } })(),
            timestamp: row.timestamp,
            createdAt: row.created_at
        };
    }

    _toCHDateTime(value) {
        const d = value instanceof Date ? value : new Date(value);
        return d.toISOString().replace('T', ' ').replace('Z', '');
    }
}

module.exports = new AuditLogRepository();
