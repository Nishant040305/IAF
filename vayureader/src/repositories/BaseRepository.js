/**
 * Base Repository
 * 
 * Abstract base class that defines the contract for all repository implementations.
 * Concrete repositories (Postgres, ClickHouse) extend this base.
 * 
 * @module repositories/BaseRepository
 */

class BaseRepository {
    /**
     * Find a single record by its ID.
     * @param {string} id
     * @param {Object} [options] - { select: [...fields] }
     * @returns {Promise<Object|null>}
     */
    async findById(id, options = {}) {
        throw new Error('findById() must be implemented by subclass');
    }

    /**
     * Find a single record matching the given filter.
     * @param {Object} filter - Key-value pairs to match
     * @param {Object} [options] - { select: [...fields] }
     * @returns {Promise<Object|null>}
     */
    async findOne(filter, options = {}) {
        throw new Error('findOne() must be implemented by subclass');
    }

    /**
     * Find multiple records matching the given filter.
     * @param {Object} filter - Key-value pairs / operators to match
     * @param {Object} [options] - { select, sort, skip, limit, lean }
     * @returns {Promise<Array<Object>>}
     */
    async find(filter = {}, options = {}) {
        throw new Error('find() must be implemented by subclass');
    }

    /**
     * Count records matching the given filter.
     * @param {Object} filter
     * @returns {Promise<number>}
     */
    async count(filter = {}) {
        throw new Error('count() must be implemented by subclass');
    }

    /**
     * Create a new record.
     * @param {Object} data
     * @returns {Promise<Object>} - Created record with id
     */
    async create(data) {
        throw new Error('create() must be implemented by subclass');
    }

    /**
     * Insert multiple records.
     * @param {Array<Object>} dataArray
     * @param {Object} [options] - { ordered: true }
     * @returns {Promise<Array<Object>>}
     */
    async insertMany(dataArray, options = {}) {
        throw new Error('insertMany() must be implemented by subclass');
    }

    /**
     * Update a record by its ID.
     * @param {string} id
     * @param {Object} data - Fields to update
     * @param {Object} [options] - { returnNew: true }
     * @returns {Promise<Object|null>}
     */
    async updateById(id, data, options = {}) {
        throw new Error('updateById() must be implemented by subclass');
    }

    /**
     * Delete a record by its ID.
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    async deleteById(id) {
        throw new Error('deleteById() must be implemented by subclass');
    }

    /**
     * Delete multiple records matching the given filter.
     * @param {Object} filter
     * @returns {Promise<number>} - Number of deleted records
     */
    async deleteMany(filter) {
        throw new Error('deleteMany() must be implemented by subclass');
    }

    /**
     * Get distinct values for a given field.
     * @param {string} field
     * @param {Object} [filter]
     * @returns {Promise<Array>}
     */
    async distinct(field, filter = {}) {
        throw new Error('distinct() must be implemented by subclass');
    }
}

module.exports = BaseRepository;
