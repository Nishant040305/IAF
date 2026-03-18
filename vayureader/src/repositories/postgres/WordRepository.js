/**
 * Word Repository (PostgreSQL)
 * 
 * @module repositories/postgres/WordRepository
 */

const PgBaseRepository = require('./PgBaseRepository');

const COLUMN_MAP = {
    _id: 'id',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
};

class WordRepository extends PgBaseRepository {
    constructor() {
        super('words', COLUMN_MAP);
    }

    _getUniqueColumn() {
        return 'word';
    }

    toJS(row) {
        const obj = super.toJS(row);
        if (obj && obj.id) {
            obj._id = obj.id;
        }
        // Ensure meanings is always parsed from JSONB
        if (obj && typeof obj.meanings === 'string') {
            obj.meanings = JSON.parse(obj.meanings);
        }
        return obj;
    }

    /**
     * Find a word with case-insensitive exact match.
     */
    async findByWord(word) {
        const { rows } = await this.pool.query(
            `SELECT * FROM ${this.tableName} WHERE UPPER(word) = UPPER($1) LIMIT 1`,
            [word]
        );
        return rows[0] ? this.toJS(rows[0]) : null;
    }

    /**
     * Find words matching a pattern (case-insensitive).
     */
    async findByPattern(pattern, limit = 20) {
        const { rows } = await this.pool.query(
            `SELECT id, word FROM ${this.tableName}
             WHERE word ILIKE $1
             LIMIT $2`,
            [`%${pattern}%`, limit]
        );
        return rows.map(r => this.toJS(r));
    }

    /**
     * Override create to ensure word is uppercased and meanings is JSONB.
     */
    async create(data) {
        const createData = { ...data };
        if (createData.meanings && typeof createData.meanings !== 'string') {
            createData.meanings = JSON.stringify(createData.meanings);
        }
        return super.create(createData);
    }

    /**
     * Override updateById to handle JSONB meanings.
     */
    async updateById(id, data, options = {}) {
        const updateData = { ...data };
        if (updateData.meanings && typeof updateData.meanings !== 'string') {
            updateData.meanings = JSON.stringify(updateData.meanings);
        }
        return super.updateById(id, updateData, options);
    }

    /**
     * Override insertMany to handle JSONB meanings.
     */
    async insertMany(dataArray, options = {}) {
        const prepared = dataArray.map(d => ({
            ...d,
            meanings: typeof d.meanings !== 'string' ? JSON.stringify(d.meanings) : d.meanings
        }));
        return super.insertMany(prepared, options);
    }

    /**
     * Find words whose names are in the given list.
     */
    async findByWords(wordList) {
        if (wordList.length === 0) return [];
        const { rows } = await this.pool.query(
            `SELECT * FROM ${this.tableName}
             WHERE word = ANY($1)`,
            [wordList]
        );
        return rows.map(r => this.toJS(r));
    }

    /**
     * Cursor-based pagination for words by word ASC.
     */
    async findPageByCursor(cursor, limit = 100) {
        if (cursor) {
            const { rows } = await this.pool.query(
                `SELECT * FROM ${this.tableName}
                 WHERE word > $1
                 ORDER BY word ASC
                 LIMIT $2`,
                [cursor, limit]
            );
            return rows.map(r => this.toJS(r));
        }

        const { rows } = await this.pool.query(
            `SELECT * FROM ${this.tableName}
             ORDER BY word ASC
             LIMIT $1`,
            [limit]
        );
        return rows.map(r => this.toJS(r));
    }
}

module.exports = new WordRepository();
