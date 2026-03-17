/**
 * ClickHouse Client
 * 
 * Manages ClickHouse connection for log/analytics storage.
 * 
 * @module db/clickhouse
 */

const { createClient } = require('@clickhouse/client');

let client = null;

/**
 * Creates and returns the ClickHouse client.
 * @param {Object} config - ClickHouse configuration
 * @returns {import('@clickhouse/client').ClickHouseClient}
 */
const getClickHouseClient = () => {
    if (!client) {
        throw new Error('ClickHouse client not initialised. Call connectClickHouse() first.');
    }
    return client;
};

/**
 * Establishes and validates the ClickHouse connection.
 * @param {Object} config - { url, database, username, password }
 * @returns {Promise<void>}
 */
const connectClickHouse = async (config) => {
    client = createClient({
        url: config.url,
        database: config.database || 'vayureader_logs',
        username: config.username || 'default',
        password: config.password || '',
        request_timeout: 30000,
        clickhouse_settings: {
            async_insert: 1,
            wait_for_async_insert: 0,
            // Accept ISO-8601 timestamps (e.g. 2026-03-17T07:44:12.233Z)
            date_time_input_format: 'best_effort'
        }
    });

    // Validate connectivity
    const result = await client.query({
        query: 'SELECT currentDatabase() AS db',
        format: 'JSONEachRow'
    });
    const rows = await result.json();
    console.log('✅ ClickHouse connected successfully');
    if (process.env.NODE_ENV !== 'production') {
        console.log(`   Database: ${rows[0].db}`);
    }
};

/**
 * Gracefully shuts down the ClickHouse client.
 * @returns {Promise<void>}
 */
const disconnectClickHouse = async () => {
    if (client) {
        await client.close();
        client = null;
        console.log('ClickHouse client closed');
    }
};

module.exports = {
    connectClickHouse,
    disconnectClickHouse,
    getClickHouseClient
};
