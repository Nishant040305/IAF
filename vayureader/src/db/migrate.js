/**
 * Database Migration Runner
 *
 * Runs SQL migrations for PostgreSQL and ClickHouse.
 *
 * Usage: node src/db/migrate.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const { connectPostgres, getPool, disconnectPostgres } = require('./postgres');
const { connectClickHouse, getClickHouseClient, disconnectClickHouse } = require('./clickhouse');
const { createClient } = require('@clickhouse/client');

// ─── Config ──────────────────────────────────────────────────────────────────

const pgConfig = {
    connectionString: process.env.POSTGRES_URI || 'postgresql://vayureader:vayureader@localhost:5432/vayureader',
    max: 5,
};

const chConfig = {
    url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
    database: process.env.CLICKHOUSE_DATABASE || 'vayureader_logs',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
};

// ─── SQL Parser ──────────────────────────────────────────────────────────────

/**
 * Parses a ClickHouse SQL file into individual executable statements.
 *
 * Rules:
 *  - Lines starting with `--` are stripped (comments).
 *  - Statements are separated by newlines that contain ONLY a blank line
 *    (i.e. we do NOT rely on semicolons, since ClickHouse HTTP interface
 *     executes one statement per request and semicolons are optional).
 *  - Each statement is trimmed and empty ones are discarded.
 *
 * Why not split on `;`?
 *  ClickHouse SQL for CREATE TABLE contains no `;` at the end in many
 *  client drivers, and splitting on `;` inside multi-line DDL can
 *  accidentally break statements that contain string literals with semicolons.
 *  Instead the schema file uses blank lines as statement separators.
 */
function parseClickHouseStatements(sql) {
    // 1. Strip comment-only lines
    const stripped = sql
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');

    // 2. Split on one-or-more blank lines
    const blocks = stripped
        .split(/\n{2,}/)
        .map(block => block.trim())
        .filter(block => block.length > 0);

    return blocks;
}

// ─── PostgreSQL Migration ─────────────────────────────────────────────────────

async function runPostgresMigrations() {
    console.log('🔧 Running PostgreSQL migrations...');
    await connectPostgres(pgConfig);
    const pool = getPool();

    const file = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    const sql = fs.readFileSync(file, 'utf8');

    await pool.query(sql);
    console.log('✅ PostgreSQL migrations completed\n');
}

// ─── ClickHouse Migration ─────────────────────────────────────────────────────

async function ensureClickHouseDatabase() {
    const client = createClient({
        url: chConfig.url,
        username: chConfig.username,
        password: chConfig.password,
        // Connect to the built-in `default` DB so we can create our target DB
        database: 'default',
    });

    try {
        await client.command({
            query: `CREATE DATABASE IF NOT EXISTS \`${chConfig.database}\``,
        });
        console.log(`📦 Database "${chConfig.database}" is ready`);
    } finally {
        await client.close();
    }
}

async function runClickHouseMigrations() {
    console.log('🔧 Running ClickHouse migrations...');

    // Step 1: Ensure the target database exists (connect without a DB)
    await ensureClickHouseDatabase();

    // Step 2: Connect to the target database
    await connectClickHouse(chConfig);
    const ch = getClickHouseClient();

    // Step 3: Verify active database
    const dbResult = await ch.query({ query: 'SELECT currentDatabase() AS db' });
    const dbJson = await dbResult.json();
    const activeDb = dbJson?.data?.[0]?.db ?? 'unknown';
    console.log(`🔍 Active database: ${activeDb}`);

    if (activeDb !== chConfig.database) {
        throw new Error(
            `Expected database "${chConfig.database}" but connected to "${activeDb}". ` +
            'Check your CLICKHOUSE_DATABASE env variable.'
        );
    }

    // Step 4: Read and parse the migration file
    const file = path.join(__dirname, 'migrations', '002_clickhouse_schema.sql');
    const sql = fs.readFileSync(file, 'utf8');
    const statements = parseClickHouseStatements(sql);

    console.log(`📝 Found ${statements.length} statement(s) to execute\n`);

    // Step 5: Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
        const stmtNumber = `[${i + 1}/${statements.length}]`;

        try {
            await ch.command({ query: stmt });
            console.log(`  ✅ ${stmtNumber} ${preview}...`);
        } catch (err) {
            // Gracefully skip "already exists" errors for indexes / tables
            const alreadyExists =
                err.message?.includes('already exists') ||
                err.code === '44' ||   // ILLEGAL_COLUMN (duplicate index)
                err.code === '57';      // TABLE_ALREADY_EXISTS

            if (alreadyExists) {
                console.warn(`  ⚠️  ${stmtNumber} Skipped (already exists): ${preview}...`);
                continue;
            }

            // Any other error is fatal
            console.error(`\n  ❌ ${stmtNumber} Failed on statement:\n\n${stmt}\n`);
            throw err;
        }
    }

    console.log('\n✅ ClickHouse migrations completed\n');
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function runMigrations() {
    try {
        await runPostgresMigrations();
        await runClickHouseMigrations();
        console.log('🎉 All migrations completed successfully!');
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await disconnectPostgres();
        await disconnectClickHouse();
    }
}

runMigrations();