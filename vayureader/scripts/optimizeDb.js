/**
 * Database Optimization Script
 * 
 * Run this script periodically (e.g., weekly) to optimize MongoDB performance.
 * 
 * Usage: node scripts/optimizeDb.js
 */

require('dotenv').config();

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vayureader';

const optimizeDatabase = async () => {
    try {
        console.log('🔧 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;

        // =====================================================================
        // 1. Ensure indexes exist for all collections
        // =====================================================================
        console.log('\n📊 Checking and creating indexes...\n');

        // PDF Documents collection indexes
        const pdfsCollection = db.collection('pdfdocuments');
        await pdfsCollection.createIndex({ category: 1 }, { background: true });
        await pdfsCollection.createIndex({ createdAt: -1 }, { background: true });
        await pdfsCollection.createIndex({ title: 'text', content: 'text' }, { background: true });
        await pdfsCollection.createIndex({ viewCount: -1 }, { background: true }); // For popular PDFs
        console.log('  ✅ PDF Documents indexes verified');

        // =====================================================================
        // 2. Compact collections (reclaim disk space)
        // =====================================================================
        console.log('\n🗜️  Running collection compaction...\n');

        const collections = ['pdfdocuments'];
        for (const collName of collections) {
            try {
                await db.command({ compact: collName });
                console.log(`  ✅ Compacted: ${collName}`);
            } catch (error) {
                // Compact may fail if collection doesn't exist
                console.log(`  ⚠️  Could not compact ${collName}: ${error.message}`);
            }
        }

        // =====================================================================
        // 3. Get collection statistics
        // =====================================================================
        console.log('\n📈 Collection Statistics:\n');

        for (const collName of collections) {
            try {
                const stats = await db.command({ collStats: collName });
                console.log(`  ${collName}:`);
                console.log(`    Documents: ${stats.count?.toLocaleString() || 0}`);
                console.log(`    Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                console.log(`    Indexes: ${stats.nindexes || 0}`);
                console.log(`    Index Size: ${((stats.totalIndexSize || 0) / 1024 / 1024).toFixed(2)} MB`);
                console.log();
            } catch (error) {
                console.log(`  ${collName}: Not found or error`);
            }
        }

        // =====================================================================
        // 4. Analyze index usage (for debugging slow queries)
        // =====================================================================
        console.log('\n🔍 Index Usage Statistics (top indexes):\n');

        for (const collName of collections) {
            try {
                const indexStats = await db.collection(collName).aggregate([
                    { $indexStats: {} }
                ]).toArray();

                console.log(`  ${collName}:`);
                indexStats.forEach(idx => {
                    console.log(`    - ${idx.name}: ${idx.accesses?.ops || 0} accesses`);
                });
                console.log();
            } catch (error) {
                console.log(`  ${collName}: Could not get index stats`);
            }
        }

        console.log('✅ Database optimization complete!\n');

    } catch (error) {
        console.error('❌ Database optimization failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
};

optimizeDatabase();
