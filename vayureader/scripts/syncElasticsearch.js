#!/usr/bin/env node
/**
 * Elasticsearch Sync Script
 * 
 * Syncs all PostgreSQL words and abbreviations to Elasticsearch.
 * Run this after initial ES setup or to rebuild indices.
 * 
 * Usage: node scripts/syncElasticsearch.js
 */

require('dotenv').config();
const { connectPostgres, disconnectPostgres } = require('../src/db/postgres');
const { esClient, INDICES, initializeIndices, isConnected } = require('../src/config/elasticsearch');
const { bulkIndexWords, bulkIndexAbbreviations } = require('../src/services/search.service');
const { WordRepository, AbbreviationRepository } = require('../src/repositories');
const { database } = require('../src/config/environment');

const BATCH_SIZE = 500;

async function syncWords() {
    console.log('[Sync] Starting words sync...');

    const total = await WordRepository.count({});
    console.log(`[Sync] Found ${total} words to sync`);

    let processed = 0;

    for (let skip = 0; skip < total; skip += BATCH_SIZE) {
        const words = await WordRepository.find({}, {
            skip,
            limit: BATCH_SIZE
        });

        await bulkIndexWords(words);
        processed += words.length;
        console.log(`[Sync] Words progress: ${processed}/${total}`);
    }

    console.log('[Sync] Words sync complete!');
}

async function syncAbbreviations() {
    console.log('[Sync] Starting abbreviations sync...');

    const total = await AbbreviationRepository.count({});
    console.log(`[Sync] Found ${total} abbreviations to sync`);

    let processed = 0;

    for (let skip = 0; skip < total; skip += BATCH_SIZE) {
        const abbreviations = await AbbreviationRepository.find({}, {
            skip,
            limit: BATCH_SIZE
        });

        await bulkIndexAbbreviations(abbreviations);
        processed += abbreviations.length;
        console.log(`[Sync] Abbreviations progress: ${processed}/${total}`);
    }

    console.log('[Sync] Abbreviations sync complete!');
}

async function main() {
    try {
        console.log('[Sync] Connecting to PostgreSQL...');
        await connectPostgres(database.postgres);
        console.log('[Sync] PostgreSQL connected');

        console.log('[Sync] Checking Elasticsearch connection...');
        const connected = await isConnected();
        if (!connected) {
            throw new Error('Elasticsearch is not available');
        }
        console.log('[Sync] Elasticsearch connected');

        // Check for clean/purge flags
        const args = process.argv.slice(2);
        const isClean = args.includes('--clean');
        const isPurge = args.includes('--purge');

        if (isClean || isPurge) {
            console.log('[Sync] 🧹 Cleaning existing indices...');
            try {
                if (await esClient.indices.exists({ index: INDICES.WORDS })) {
                    await esClient.indices.delete({ index: INDICES.WORDS });
                    console.log(`[Sync] Deleted index: ${INDICES.WORDS}`);
                }
                if (await esClient.indices.exists({ index: INDICES.ABBREVIATIONS })) {
                    await esClient.indices.delete({ index: INDICES.ABBREVIATIONS });
                    console.log(`[Sync] Deleted index: ${INDICES.ABBREVIATIONS}`);
                }
            } catch (err) {
                console.error('[Sync] Clean failed:', err.message);
            }

            if (isPurge) {
                console.log('[Sync] 🗑️ Purge complete. Indices deleted. Exiting.');
                await disconnectPostgres();
                process.exit(0);
            }
        }

        console.log('[Sync] Initializing ES indices...');
        await initializeIndices();
        console.log('[Sync] Indices ready');

        await syncWords();
        await syncAbbreviations();

        console.log('[Sync] ✅ All data synced successfully!');
    } catch (error) {
        console.error('[Sync] ❌ Error:', error.message);
        process.exit(1);
    } finally {
        await disconnectPostgres();
        console.log('[Sync] PostgreSQL disconnected');
        process.exit(0);
    }
}

main();
