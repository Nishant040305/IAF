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
    async searchWithPagination(searchTerm, page, limit) {
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
                limit
            }),
            this.count(filter)
        ]);

        return { documents, total };
    }

    /**
     * Increment view count and return updated document.
     */
    async incrementViewCount(id) {
        return this.updateById(id, { $inc: { viewCount: 1 } });
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
