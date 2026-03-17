/**
 * PostgreSQL Connection Pool
 * 
 * Manages PostgreSQL connection with proper error handling and pooling.
 * 
 * @module db/postgres
 */

const { Pool } = require('pg');

let pool = null;

/**
 * Creates and returns the PostgreSQL connection pool.
 * @param {Object} config - Pool configuration
 * @returns {Pool}
 */
const createPool = (config) => {
    if (pool) return pool;

    pool = new Pool(config);

    pool.on('error', (err) => {
        console.error('❌ PostgreSQL pool error:', err.message);
    });

    pool.on('connect', () => {
        // Logged only in development for debugging
        if (process.env.NODE_ENV !== 'production') {
            console.log('   PG pool: new client connected');
        }
    });

    return pool;
};

/**
 * Gets the current pool instance.
 * @returns {Pool}
 */
const getPool = () => {
    if (!pool) {
        throw new Error('PostgreSQL pool not initialised. Call connectPostgres() first.');
    }
    return pool;
};

/**
 * Establishes and validates the PostgreSQL connection.
 * @param {Object} config - Pool configuration from environment
 * @returns {Promise<void>}
 */
const connectPostgres = async (config) => {
    createPool(config);

    // Validate connectivity
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT current_database() AS db');
        console.log('✅ PostgreSQL connected successfully');
        if (process.env.NODE_ENV !== 'production') {
            console.log(`   Database: ${res.rows[0].db}`);
        }
    } finally {
        client.release();
    }
};

/**
 * Gracefully shuts down the pool.
 * @returns {Promise<void>}
 */
const disconnectPostgres = async () => {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('PostgreSQL pool closed');
    }
};

module.exports = {
    connectPostgres,
    disconnectPostgres,
    getPool
};
