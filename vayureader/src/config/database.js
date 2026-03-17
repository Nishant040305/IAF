/**
 * Database Connection
 * 
 * Manages PostgreSQL + ClickHouse connections with proper error handling.
 * 
 * @module config/database
 */

const { connectPostgres, disconnectPostgres } = require('../db/postgres');
const { connectClickHouse, disconnectClickHouse } = require('../db/clickhouse');
const { database } = require('./environment');

/**
 * Establishes connections to both PostgreSQL and ClickHouse.
 * @returns {Promise<void>}
 */
const connectDB = async () => {
    try {
        // Connect to PostgreSQL (general data)
        await connectPostgres(database.postgres);

        // Connect to ClickHouse (logs/analytics)
        await connectClickHouse(database.clickhouse);

        console.log('✅ All database connections established');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await disconnectPostgres();
        await disconnectClickHouse();
        console.log('Database connections closed through app termination');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

module.exports = { connectDB };
