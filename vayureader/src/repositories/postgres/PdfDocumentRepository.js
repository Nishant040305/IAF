/**
 * PDF Document Repository (PostgreSQL)
 * 
 * @module repositories/postgres/PdfDocumentRepository
 */

const PgBaseRepository = require('./PgBaseRepository');

const COLUMN_MAP = {
    _id: 'id',
    pdfUrl: 'pdf_url',
    viewCount: 'view_count',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
};

class PdfDocumentRepository extends PgBaseRepository {
    constructor() {
        super('pdf_documents', COLUMN_MAP);
    }

    _getUniqueColumn() {
        return null; // No unique constraint besides PK
    }

    toJS(row) {
        const obj = super.toJS(row);
        if (obj && obj.id) {
            obj._id = obj.id;
        }
        return obj;
    }

    /**
     * Search PDFs with regex-like text matching.
     * Replaces MongoDB $regex with PostgreSQL ILIKE.
     */
    async searchWithPagination(searchTerm, page, limit, select = null) {
        const skip = (page - 1) * limit;
        let filter = {};

        if (searchTerm) {
            filter.$or = [
                { title: { $regex: searchTerm } },
                { content: { $regex: searchTerm } },
                { category: { $regex: searchTerm } }
            ];
        }

        const [documents, total] = await Promise.all([
            this.find(filter, {
                sort: { createdAt: -1 },
                skip,
                limit,
                select: Array.isArray(select) ? select : undefined
            }),
            this.count(filter)
        ]);

        return { documents, total };
    }

    /**
     * Increment view count and return updated document.
     * @deprecated Use queue-based batching (incrementViewCountsBulk) instead.
     */
    async incrementViewCount(id) {
        return this.updateById(id, { $inc: { viewCount: 1 } });
    }

    /**
     * Bulk increment view counts based on aggregated batched data.
     * Takes an object mapping pdf ID to total increment counts.
     */
    async incrementViewCountsBulk(viewCounts) {
        const ids = [];
        const counts = [];
        
        for (const [id, count] of Object.entries(viewCounts)) {
            if (count > 0) {
                ids.push(id);
                counts.push(count);
            }
        }

        if (ids.length === 0) return;

        // HIGHLY SCALABLE BATCH UPDATE:
        // Uses PostgreSQL unnest arrays mapped to rows inside ONE single network round-trip.
        // Drops O(n) promise queries to O(1) query completely averting connection pool exhaustion.
        const query = `
            UPDATE ${this.tableName} AS t
            SET view_count = t.view_count + v.count, updated_at = NOW()
            FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::int[]) AS count) AS v
            WHERE t.id = v.id
        `;
        
        await this.pool.query(query, [ids, counts]);
    }

    /**
     * Cursor-based pagination for PDFs.
     * Sort order: created_at DESC, id DESC.
     */
    async findPageByCursor({ category = null, limit = 50, cursor = null, select = null } = {}) {
        const conditions = [];
        const values = [];
        let idx = 1;

        if (category) {
            conditions.push(`category = $${idx}`);
            values.push(category);
            idx++;
        }

        if (cursor && cursor.createdAt && cursor.id) {
            conditions.push(`(created_at, id) < ($${idx}, $${idx + 1})`);
            values.push(cursor.createdAt, cursor.id);
            idx += 2;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const selectClause = this.buildSelect(Array.isArray(select) ? select : null);

        values.push(limit);
        const sql = `SELECT ${selectClause} FROM ${this.tableName}
                     ${whereClause}
                     ORDER BY created_at DESC, id DESC
                     LIMIT $${idx}`;
        const { rows } = await this.pool.query(sql, values);
        return rows.map(r => this.toJS(r));
    }

    /**
     * Cursor-based search with ILIKE.
     * Sort order: created_at DESC, id DESC.
     */
    async searchWithCursor({ searchTerm = null, limit = 50, cursor = null, select = null } = {}) {
        const conditions = [];
        const values = [];
        let idx = 1;

        if (searchTerm) {
            conditions.push(`(title ILIKE $${idx} OR content ILIKE $${idx} OR category ILIKE $${idx})`);
            values.push(`%${searchTerm}%`);
            idx++;
        }

        if (cursor && cursor.createdAt && cursor.id) {
            conditions.push(`(created_at, id) < ($${idx}, $${idx + 1})`);
            values.push(cursor.createdAt, cursor.id);
            idx += 2;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const selectClause = this.buildSelect(Array.isArray(select) ? select : null);

        values.push(limit);
        const sql = `SELECT ${selectClause} FROM ${this.tableName}
                     ${whereClause}
                     ORDER BY created_at DESC, id DESC
                     LIMIT $${idx}`;
        const { rows } = await this.pool.query(sql, values);
        return rows.map(r => this.toJS(r));
    }

    /**
     * Find by PDF URL or thumbnail URL.
     */
    async findByFileUrl(requestedPath) {
        const { rows } = await this.pool.query(
            `SELECT * FROM ${this.tableName}
             WHERE pdf_url = $1 OR thumbnail = $1
             LIMIT 1`,
            [requestedPath]
        );
        return rows[0] ? this.toJS(rows[0]) : null;
    }
}

module.exports = new PdfDocumentRepository();
