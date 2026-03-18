/**
 * Abbreviation Repository (PostgreSQL)
 * 
 * @module repositories/postgres/AbbreviationRepository
 */

const PgBaseRepository = require('./PgBaseRepository');

const COLUMN_MAP = {
    _id: 'id',
    fullForm: 'full_form',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
};

class AbbreviationRepository extends PgBaseRepository {
    constructor() {
        super('abbreviations', COLUMN_MAP);
    }

    _getUniqueColumn() {
        return 'abbreviation';
    }

    toJS(row) {
        const obj = super.toJS(row);
        if (obj && obj.id) {
            obj._id = obj.id;
        }
        return obj;
    }

    /**
     * Find abbreviation with case-insensitive exact match.
     */
    async findByAbbr(abbr) {
        const { rows } = await this.pool.query(
            `SELECT * FROM ${this.tableName} WHERE UPPER(abbreviation) = UPPER($1) LIMIT 1`,
            [abbr]
        );
        return rows[0] ? this.toJS(rows[0]) : null;
    }

    /**
     * Search abbreviations by pattern.
     */
    async searchByPattern(pattern, limit = 100) {
        const { rows } = await this.pool.query(
            `SELECT * FROM ${this.tableName}
             WHERE abbreviation ILIKE $1 OR full_form ILIKE $1
             ORDER BY abbreviation ASC
             LIMIT $2`,
            [`%${pattern}%`, limit]
        );
        return rows.map(r => this.toJS(r));
    }

    /**
     * Export all abbreviations (abbreviation + fullForm only, no id).
     */
    async exportAll() {
        const { rows } = await this.pool.query(
            `SELECT abbreviation, full_form FROM ${this.tableName}
             ORDER BY abbreviation ASC`
        );
        return rows.map(r => ({
            abbreviation: r.abbreviation,
            fullForm: r.full_form
        }));
    }

    /**
     * Cursor-based pagination for abbreviations by abbreviation ASC.
     */
    async findPageByCursor(cursor, limit = 100) {
        if (cursor) {
            const { rows } = await this.pool.query(
                `SELECT * FROM ${this.tableName}
                 WHERE abbreviation > $1
                 ORDER BY abbreviation ASC
                 LIMIT $2`,
                [cursor, limit]
            );
            return rows.map(r => this.toJS(r));
        }

        const { rows } = await this.pool.query(
            `SELECT * FROM ${this.tableName}
             ORDER BY abbreviation ASC
             LIMIT $1`,
            [limit]
        );
        return rows.map(r => this.toJS(r));
    }

    /**
     * Cursor-based pagination by created_at DESC, id DESC.
     */
    async findPageByCreatedAtCursor({ cursor = null, limit = 100 } = {}) {
        const conditions = [];
        const values = [];
        let idx = 1;

        if (cursor && cursor.createdAt && cursor.id) {
            conditions.push(`(created_at, id) < ($${idx}, $${idx + 1})`);
            values.push(cursor.createdAt, cursor.id);
            idx += 2;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        values.push(limit);

        const sql = `SELECT * FROM ${this.tableName}
                     ${whereClause}
                     ORDER BY created_at DESC, id DESC
                     LIMIT $${idx}`;
        const { rows } = await this.pool.query(sql, values);
        return rows.map(r => this.toJS(r));
    }
}

module.exports = new AbbreviationRepository();
