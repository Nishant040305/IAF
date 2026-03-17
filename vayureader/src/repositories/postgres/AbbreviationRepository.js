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
}

module.exports = new AbbreviationRepository();
