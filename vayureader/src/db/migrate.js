/**
 * Database Migration Runner
 * 
 * Runs SQL migrations for PostgreSQL and ClickHouse.
 * 
 * Usage: node src/db/migrate.js
 * 
 * @module db/migrate
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectPostgres, getPool, disconnectPostgres } = require('./postgres');
const { connectClickHouse, getClickHouseClient, disconnectClickHouse } = require('./clickhouse');

const pgConfig = {
    connectionString: process.env.POSTGRES_URI || 'postgresql://vayureader:vayureader@localhost:5432/vayureader',
    max: 5
};

const chConfig = {
    url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
    database: process.env.CLICKHOUSE_DATABASE || 'vayureader_logs',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || ''
};

const runMigrations = async () => {
    try {
        // =============================================
        // PostgreSQL Migrations
        // =============================================
        console.log('\n🔧 Running PostgreSQL migrations...\n');
        await connectPostgres(pgConfig);
        const pool = getPool();

        const pgMigrationFile = path.join(__dirname, 'migrations', '001_initial_schema.sql');
        const pgSql = fs.readFileSync(pgMigrationFile, 'utf8');

        await pool.query(pgSql);
        console.log('✅ PostgreSQL migrations completed\n');

        // =============================================
        // ClickHouse Migrations
        // =============================================
        console.log('🔧 Running ClickHouse migrations...\n');

        // First, ensure the database exists (connect to default DB)
        const initClient = require('@clickhouse/client').createClient({
            url: chConfig.url,
            username: chConfig.username,
            password: chConfig.password
        });
        await initClient.command({
            query: `CREATE DATABASE IF NOT EXISTS ${chConfig.database}`
        });
        await initClient.close();

        await connectClickHouse(chConfig);
        const ch = getClickHouseClient();

        const chMigrationFile = path.join(__dirname, 'migrations', '002_clickhouse_schema.sql');
        const chSql = fs.readFileSync(chMigrationFile, 'utf8');

        // ClickHouse requires statements to be executed one at a time
        const statements = chSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const stmt of statements) {
            await ch.command({ query: stmt });
        }

        console.log('✅ ClickHouse migrations completed\n');

        console.log('🎉 All migrations completed successfully!\n');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await disconnectPostgres();
        await disconnectClickHouse();
    }
};

runMigrations();
