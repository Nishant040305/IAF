/**
 * Database Optimization Script
 * 
 * Run this script periodically (e.g., weekly) to optimize PostgreSQL performance.
 * 
 * Usage: node scripts/optimizeDb.js
 */

require('dotenv').config();

const { connectPostgres, getPool, disconnectPostgres } = require('../src/db/postgres');
const { database } = require('../src/config/environment');

const optimizeDatabase = async () => {
    try {
        console.log('🔧 Connecting to PostgreSQL...');
        await connectPostgres(database.postgres);
        console.log('✅ Connected to PostgreSQL');

        const pool = getPool();

        // =====================================================================
        // 1. Run ANALYSE on all tables (updates planner statistics)
        // =====================================================================
        console.log('\n📊 Running ANALYZE on all tables...\n');

        const tables = ['users', 'admins', 'pdf_documents', 'words', 'abbreviations'];
        for (const table of tables) {
            try {
                await pool.query(`ANALYZE ${table}`);
                console.log(`  ✅ Analyzed: ${table}`);
            } catch (error) {
                console.log(`  ⚠️  Could not analyze ${table}: ${error.message}`);
            }
        }

        // =====================================================================
        // 2. Run VACUUM on all tables (reclaim disk space)
        // =====================================================================
        console.log('\n🗜️  Running VACUUM on tables...\n');

        for (const table of tables) {
            try {
                await pool.query(`VACUUM ANALYZE ${table}`);
                console.log(`  ✅ Vacuumed: ${table}`);
            } catch (error) {
                console.log(`  ⚠️  Could not vacuum ${table}: ${error.message}`);
            }
        }

        // =====================================================================
        // 3. Get table statistics
        // =====================================================================
        console.log('\n📈 Table Statistics:\n');

        for (const table of tables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) AS count FROM ${table}`);
                const sizeResult = await pool.query(
                    `SELECT pg_size_pretty(pg_total_relation_size($1)) AS total_size,
                            pg_size_pretty(pg_indexes_size($1)) AS index_size`,
                    [table]
                );
                console.log(`  ${table}:`);
                console.log(`    Documents: ${parseInt(countResult.rows[0].count).toLocaleString()}`);
                console.log(`    Total Size: ${sizeResult.rows[0].total_size}`);
                console.log(`    Index Size: ${sizeResult.rows[0].index_size}`);
                console.log();
            } catch (error) {
                console.log(`  ${table}: Not found or error (${error.message})`);
            }
        }

        // =====================================================================
        // 4. Check index usage (for debugging slow queries)
        // =====================================================================
        console.log('\n🔍 Index Usage Statistics:\n');

        for (const table of tables) {
            try {
                const indexResult = await pool.query(`
                    SELECT indexrelname AS index_name,
                           idx_scan AS scans,
                           idx_tup_read AS tuples_read,
                           idx_tup_fetch AS tuples_fetched,
                           pg_size_pretty(pg_relation_size(indexrelid)) AS size
                    FROM pg_stat_user_indexes
                    WHERE relname = $1
                    ORDER BY idx_scan DESC
                `, [table]);

                console.log(`  ${table}:`);
                for (const idx of indexResult.rows) {
                    console.log(`    - ${idx.index_name}: ${idx.scans} scans, ${idx.tuples_read} reads (${idx.size})`);
                }
                console.log();
            } catch (error) {
                console.log(`  ${table}: Could not get index stats`);
            }
        }

        // =====================================================================
        // 5. Check for unused indexes
        // =====================================================================
        console.log('\n⚠️  Unused Indexes (0 scans since last stats reset):\n');

        try {
            const unusedResult = await pool.query(`
                SELECT relname AS table_name,
                       indexrelname AS index_name,
                       pg_size_pretty(pg_relation_size(indexrelid)) AS size
                FROM pg_stat_user_indexes
                WHERE idx_scan = 0
                AND relname = ANY($1)
                ORDER BY pg_relation_size(indexrelid) DESC
            `, [tables]);

            if (unusedResult.rows.length === 0) {
                console.log('  ✅ No unused indexes found');
            } else {
                for (const idx of unusedResult.rows) {
                    console.log(`  - ${idx.table_name}.${idx.index_name} (${idx.size})`);
                }
            }
        } catch (error) {
            console.log('  Could not check unused indexes');
        }

        console.log('\n✅ Database optimization complete!\n');

    } catch (error) {
        console.error('❌ Database optimization failed:', error.message);
        process.exit(1);
    } finally {
        await disconnectPostgres();
        console.log('🔌 Disconnected from PostgreSQL');
    }
};

optimizeDatabase();
