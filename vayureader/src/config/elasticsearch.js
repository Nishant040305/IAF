/**
 * Elasticsearch Configuration
 * 
 * Sets up connection to Elasticsearch for search functionality.
 * 
 * @module config/elasticsearch
 */

const { Client } = require('@elastic/elasticsearch');

// ES URL from environment or default
const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';

// Create ES client
const esClient = new Client({
    node: ELASTICSEARCH_URL,
    requestTimeout: 10000,
    maxRetries: 3
});

// Index names
const INDICES = {
    WORDS: 'vayureader_words',
    ABBREVIATIONS: 'vayureader_abbreviations'
};

const HEALTH_CACHE_TTL_MS = parseInt(process.env.ES_HEALTH_TTL_MS || '30000', 10);
let lastHealthCheck = 0;
let lastHealthStatus = null;

/**
 * Check if Elasticsearch is connected.
 */
const isConnected = async () => {
    try {
        const now = Date.now();
        if (lastHealthStatus !== null && (now - lastHealthCheck) < HEALTH_CACHE_TTL_MS) {
            return lastHealthStatus;
        }

        const health = await esClient.cluster.health();
        lastHealthStatus = health.status !== 'red';
        lastHealthCheck = now;
        return lastHealthStatus;
    } catch (error) {
        console.error('[ES] Connection check failed:', error.message);
        lastHealthStatus = false;
        lastHealthCheck = Date.now();
        return false;
    }
};

/**
 * Initialize Elasticsearch indices with mappings.
 */
const initializeIndices = async () => {
    try {
        // Words index
        const wordsExists = await esClient.indices.exists({ index: INDICES.WORDS });
        if (!wordsExists) {
            await esClient.indices.create({
                index: INDICES.WORDS,
                body: {
                    settings: {
                        analysis: {
                            analyzer: {
                                autocomplete: {
                                    type: 'custom',
                                    tokenizer: 'standard',
                                    filter: ['lowercase', 'edge_ngram_filter']
                                }
                            },
                            filter: {
                                edge_ngram_filter: {
                                    type: 'edge_ngram',
                                    min_gram: 2,
                                    max_gram: 20
                                }
                            }
                        }
                    },
                    mappings: {
                        properties: {
                            word: {
                                type: 'text',
                                analyzer: 'autocomplete',
                                search_analyzer: 'standard',
                                fields: {
                                    keyword: { type: 'keyword' }
                                }
                            },
                            meanings: {
                                type: 'nested',
                                properties: {
                                    partOfSpeech: { type: 'keyword' },
                                    definition: { type: 'text' }
                                }
                            },
                            synonyms: { type: 'keyword' },
                            antonyms: { type: 'keyword' },
                            mongoId: { type: 'keyword' }
                        }
                    }
                }
            });
            console.log('[ES] Created words index');
        }

        // Abbreviations index
        const abbrExists = await esClient.indices.exists({ index: INDICES.ABBREVIATIONS });
        if (!abbrExists) {
            await esClient.indices.create({
                index: INDICES.ABBREVIATIONS,
                body: {
                    settings: {
                        analysis: {
                            analyzer: {
                                autocomplete: {
                                    type: 'custom',
                                    tokenizer: 'standard',
                                    filter: ['lowercase', 'edge_ngram_filter']
                                }
                            },
                            filter: {
                                edge_ngram_filter: {
                                    type: 'edge_ngram',
                                    min_gram: 2,
                                    max_gram: 20
                                }
                            }
                        }
                    },
                    mappings: {
                        properties: {
                            abbreviation: {
                                type: 'text',
                                analyzer: 'autocomplete',
                                search_analyzer: 'standard',
                                fields: {
                                    keyword: { type: 'keyword' }
                                }
                            },
                            fullForm: {
                                type: 'text',
                                analyzer: 'autocomplete',
                                search_analyzer: 'standard'
                            },
                            mongoId: { type: 'keyword' }
                        }
                    }
                }
            });
            console.log('[ES] Created abbreviations index');
        }

        return true;
    } catch (error) {
        console.error('[ES] Index initialization failed:', error.message);
        return false;
    }
};

module.exports = {
    esClient,
    INDICES,
    isConnected,
    initializeIndices
};
