/**
 * PostgreSQL Base Repository
 * 
 * Provides common SQL building logic for all PostgreSQL repositories.
 * Maps the BaseRepository interface to PostgreSQL queries.
 * 
 * @module repositories/postgres/PgBaseRepository
 */

const BaseRepository = require('../BaseRepository');
const { getPool } = require('../../db/postgres');

/**
 * Column name mapping: camelCase JS -> snake_case SQL
 * Subclasses override this with their own mapping.
 */
const DEFAULT_COLUMN_MAP = {};

class PgBaseRepository extends BaseRepository {
    /**
     * @param {string} tableName - SQL table name
     * @param {Object} columnMap - camelCase -> snake_case mapping
     */
    constructor(tableName, columnMap = {}) {
        super();
        this.tableName = tableName;
        this.columnMap = columnMap;
    }

    /** Get the pool */
    get pool() {
        return getPool();
    }

    // =====================================================================
    // COLUMN MAPPING HELPERS
    // =====================================================================

    /**
     * Converts a JS camelCase key to its SQL snake_case column name.
     */
    toColumn(key) {
        return this.columnMap[key] || key;
    }

    /**
     * Converts a SQL row (snake_case) to JS object (camelCase).
     * Subclasses can override for custom transformations.
     */
    toJS(row) {
        if (!row) return null;
        const reverseMap = {};
        for (const [js, sql] of Object.entries(this.columnMap)) {
            reverseMap[sql] = js;
        }
        const result = {};
        for (const [key, value] of Object.entries(row)) {
            const jsKey = reverseMap[key] || key;
            result[jsKey] = value;
        }
        return result;
    }

    /**
     * Converts a JS data object to SQL columns/values.
     */
    toSQL(data) {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            const col = this.toColumn(key);
            result[col] = value;
        }
        return result;
    }

    // =====================================================================
    // QUERY BUILDERS
    // =====================================================================

    /**
     * Build a WHERE clause from a filter object.
     * Supports: simple equality, $regex (ILIKE), $or, $gte/$lte, $in, $inc,
     *           and column = value.
     * 
     * @param {Object} filter
     * @param {number} paramOffset - Starting parameter index ($1, $2...)
     * @returns {{ clause: string, values: Array }}
     */
    buildWhere(filter, paramOffset = 1) {
        if (!filter || Object.keys(filter).length === 0) {
            return { clause: '', values: [] };
        }

        const conditions = [];
        const values = [];
        let idx = paramOffset;

        // Handle $or operator
        if (filter.$or) {
            const orConditions = [];
            for (const orFilter of filter.$or) {
                const subResult = this.buildWhere(orFilter, idx);
                if (subResult.clause) {
                    orConditions.push(subResult.clause.replace('WHERE ', ''));
                    values.push(...subResult.values);
                    idx += subResult.values.length;
                }
            }
            if (orConditions.length > 0) {
                conditions.push(`(${orConditions.join(' OR ')})`);
            }
        }

        for (const [key, value] of Object.entries(filter)) {
            if (key === '$or') continue;

            const col = this.toColumn(key);

            if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                // Handle operators
                if (value.$regex) {
                    // Convert regex to ILIKE pattern
                    const pattern = `%${value.$regex}%`;
                    conditions.push(`${col} ILIKE $${idx}`);
                    values.push(pattern);
                    idx++;
                }
                if (value.$gte !== undefined) {
                    conditions.push(`${col} >= $${idx}`);
                    values.push(value.$gte);
                    idx++;
                }
                if (value.$lte !== undefined) {
                    conditions.push(`${col} <= $${idx}`);
                    values.push(value.$lte);
                    idx++;
                }
                if (value.$lt !== undefined) {
                    conditions.push(`${col} < $${idx}`);
                    values.push(value.$lt);
                    idx++;
                }
                if (value.$in !== undefined) {
                    conditions.push(`${col} = ANY($${idx})`);
                    values.push(value.$in);
                    idx++;
                }
            } else {
                // Simple equality
                conditions.push(`${col} = $${idx}`);
                values.push(value);
                idx++;
            }
        }

        const clause = conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        return { clause, values };
    }

    /**
     * Build SELECT column list from options.select.
     */
    buildSelect(selectFields) {
        if (!selectFields || selectFields.length === 0) return '*';
        return selectFields.map(f => this.toColumn(f)).join(', ');
    }

    /**
     * Build ORDER BY clause from options.sort.
     * sort: { field: 1|-1 } or { field: 'ASC'|'DESC' }
     */
    buildOrderBy(sort) {
        if (!sort) return '';
        const parts = [];
        for (const [key, dir] of Object.entries(sort)) {
            const col = this.toColumn(key);
            const direction = dir === -1 || dir === 'DESC' ? 'DESC' : 'ASC';
            parts.push(`${col} ${direction}`);
        }
        return parts.length > 0 ? `ORDER BY ${parts.join(', ')}` : '';
    }

    // =====================================================================
    // CRUD METHODS
    // =====================================================================

    async findById(id, options = {}) {
        const select = this.buildSelect(options.select);
        const { rows } = await this.pool.query(
            `SELECT ${select} FROM ${this.tableName} WHERE id = $1`,
            [id]
        );
        return rows[0] ? this.toJS(rows[0]) : null;
    }

    async findOne(filter, options = {}) {
        const select = this.buildSelect(options.select);
        const { clause, values } = this.buildWhere(filter);
        const { rows } = await this.pool.query(
            `SELECT ${select} FROM ${this.tableName} ${clause} LIMIT 1`,
            values
        );
        return rows[0] ? this.toJS(rows[0]) : null;
    }

    async find(filter = {}, options = {}) {
        const select = this.buildSelect(options.select);
        const { clause, values } = this.buildWhere(filter);
        const orderBy = this.buildOrderBy(options.sort);
        let idx = values.length + 1;

        let limitClause = '';
        if (options.limit) {
            limitClause = `LIMIT $${idx}`;
            values.push(options.limit);
            idx++;
        }

        let offsetClause = '';
        if (options.skip) {
            offsetClause = `OFFSET $${idx}`;
            values.push(options.skip);
            idx++;
        }

        const sql = `SELECT ${select} FROM ${this.tableName} ${clause} ${orderBy} ${limitClause} ${offsetClause}`.trim();
        const { rows } = await this.pool.query(sql, values);
        return rows.map(r => this.toJS(r));
    }

    async count(filter = {}) {
        const { clause, values } = this.buildWhere(filter);
        const { rows } = await this.pool.query(
            `SELECT COUNT(*) AS count FROM ${this.tableName} ${clause}`,
            values
        );
        return parseInt(rows[0].count, 10);
    }

    async create(data) {
        const sqlData = this.toSQL(data);
        const keys = Object.keys(sqlData);
        const vals = Object.values(sqlData);
        const placeholders = keys.map((_, i) => `$${i + 1}`);

        const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')})
                     VALUES (${placeholders.join(', ')})
                     RETURNING *`;
        const { rows } = await this.pool.query(sql, vals);
        return this.toJS(rows[0]);
    }

    async insertMany(dataArray, options = {}) {
        if (dataArray.length === 0) return [];

        const results = [];
        const ignoreConflicts = options.ordered === false;

        // Build batch insert
        const sqlData = dataArray.map(d => this.toSQL(d));
        const keys = Object.keys(sqlData[0]);
        const allValues = [];
        const valuePlaceholders = [];

        let paramIdx = 1;
        for (const row of sqlData) {
            const rowPlaceholders = [];
            for (const key of keys) {
                rowPlaceholders.push(`$${paramIdx}`);
                allValues.push(row[key]);
                paramIdx++;
            }
            valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
        }

        let sql = `INSERT INTO ${this.tableName} (${keys.join(', ')})
                   VALUES ${valuePlaceholders.join(', ')}`;

        if (ignoreConflicts) {
            // Find the unique constraint column(s) for this table
            const uniqueCol = this._getUniqueColumn();
            if (uniqueCol) {
                sql += ` ON CONFLICT (${uniqueCol}) DO NOTHING`;
            }
        }

        sql += ' RETURNING *';

        try {
            const { rows } = await this.pool.query(sql, allValues);
            return rows.map(r => this.toJS(r));
        } catch (error) {
            if (error.code === '23505' && ignoreConflicts) {
                // Unique violation - return empty, mimic Mongoose ordered:false behavior
                return [];
            }
            throw error;
        }
    }

    async updateById(id, data, options = {}) {
        // Handle $inc operator
        const setClauses = [];
        const values = [];
        let idx = 1;

        const sqlData = {};
        const incData = {};

        for (const [key, value] of Object.entries(data)) {
            if (key === '$inc') {
                for (const [incKey, incVal] of Object.entries(value)) {
                    incData[incKey] = incVal;
                }
            } else {
                sqlData[key] = value;
            }
        }

        // Regular SET clauses
        for (const [key, value] of Object.entries(sqlData)) {
            const col = this.toColumn(key);
            setClauses.push(`${col} = $${idx}`);
            values.push(value);
            idx++;
        }

        // INCREMENT clauses
        for (const [key, value] of Object.entries(incData)) {
            const col = this.toColumn(key);
            setClauses.push(`${col} = ${col} + $${idx}`);
            values.push(value);
            idx++;
        }

        if (setClauses.length === 0) return this.findById(id);

        values.push(id);
        const sql = `UPDATE ${this.tableName}
                     SET ${setClauses.join(', ')}
                     WHERE id = $${idx}
                     RETURNING *`;

        const { rows } = await this.pool.query(sql, values);
        return rows[0] ? this.toJS(rows[0]) : null;
    }

    async deleteById(id) {
        const { rowCount } = await this.pool.query(
            `DELETE FROM ${this.tableName} WHERE id = $1`,
            [id]
        );
        return rowCount > 0;
    }

    async deleteMany(filter) {
        const { clause, values } = this.buildWhere(filter);
        const { rowCount } = await this.pool.query(
            `DELETE FROM ${this.tableName} ${clause}`,
            values
        );
        return rowCount;
    }

    async distinct(field, filter = {}) {
        const col = this.toColumn(field);
        const { clause, values } = this.buildWhere(filter);
        const { rows } = await this.pool.query(
            `SELECT DISTINCT ${col} FROM ${this.tableName} ${clause} ORDER BY ${col}`,
            values
        );
        return rows.map(r => r[col]);
    }

    /**
     * Override in subclass to return the unique constraint column(s)
     * for ON CONFLICT handling in insertMany.
     * @returns {string|null}
     */
    _getUniqueColumn() {
        return null;
    }
}

module.exports = PgBaseRepository;
