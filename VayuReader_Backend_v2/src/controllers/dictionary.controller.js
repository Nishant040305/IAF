/**
 * Dictionary Controller
 * 
 * Handles dictionary word CRUD business logic.
 * 
 * @module controllers/dictionary.controller
 */

const Word = require('../models/Word');
const { logCreate, logUpdate, logDelete, RESOURCE_TYPES } = require('../services/audit.service');
const response = require('../utils/response');
const { escapeRegex, createExactMatchRegex } = require('../utils/sanitize');

/**
 * Look up a word and get related words.
 */
const lookupWord = async (req, res, next) => {
    try {
        const word = req.params.word;

        if (!word) {
            return response.badRequest(res, 'Word parameter is required');
        }

        const safeWord = escapeRegex(word);

        const [wordDoc, relatedWords] = await Promise.all([
            Word.findOne({ word: createExactMatchRegex(word) }).lean(),
            Word.find({ word: { $regex: safeWord, $options: 'i' } })
                .limit(20)
                .select('word')
                .lean()
        ]);

        if (!wordDoc) {
            return response.notFound(res, 'Word not found', {
                word,
                related: relatedWords.map(w => w.word)
            });
        }

        response.success(res, {
            word: wordDoc.word,
            meanings: wordDoc.meanings,
            synonyms: wordDoc.synonyms,
            antonyms: wordDoc.antonyms,
            related: relatedWords
                .map(w => w.word)
                .filter(w => w.toLowerCase() !== word.toLowerCase())
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get first 100 words.
 */
const getWords = async (req, res, next) => {
    try {
        const words = await Word.find()
            .limit(100)
            .select('word')
            .lean();

        response.success(res, {
            total: words.length,
            words: words.map(w => w.word)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all words.
 */
const getAllWords = async (req, res, next) => {
    try {
        const words = await Word.find({})
            .sort({ word: 1 })
            .lean();

        response.success(res, words);
    } catch (error) {
        next(error);
    }
};

/**
 * Search words.
 */
const searchWords = async (req, res, next) => {
    try {
        const searchTerm = req.params.term;

        if (!searchTerm) {
            return response.badRequest(res, 'Search term is required');
        }

        const safeSearch = escapeRegex(searchTerm);

        const results = await Word.find({
            word: { $regex: safeSearch, $options: 'i' }
        })
            .limit(20)
            .lean();

        response.success(res, {
            total: results.length,
            words: results
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add a new word.
 */
const createWord = async (req, res, next) => {
    try {
        const { word, meanings, synonyms, antonyms } = req.body;

        if (!Array.isArray(meanings) || meanings.length === 0 || !meanings[0].definition) {
            return response.badRequest(res, 'At least one meaning with definition is required');
        }

        // Check for existing word
        const existing = await Word.findOne({ word: word.toUpperCase() });
        if (existing) {
            return response.conflict(res, 'Word already exists');
        }

        const formattedMeanings = meanings.map(m => ({
            partOfSpeech: m.partOfSpeech || null,
            definition: m.definition,
            synonyms: Array.isArray(m.synonyms) ? m.synonyms : [],
            examples: Array.isArray(m.examples) ? m.examples : []
        }));

        const newWord = new Word({
            word: word.toUpperCase(),
            meanings: formattedMeanings,
            synonyms: Array.isArray(synonyms) ? synonyms : [],
            antonyms: Array.isArray(antonyms) ? antonyms : []
        });

        await newWord.save();

        await logCreate(RESOURCE_TYPES.DICTIONARY, newWord._id, req.admin, {
            word: newWord.word
        });

        response.created(res, newWord, 'Word added successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Update a word.
 */
const updateWord = async (req, res, next) => {
    try {
        const { word, meanings, synonyms, antonyms } = req.body;

        if (!word || !meanings || !Array.isArray(meanings) || meanings.length === 0) {
            return response.badRequest(res, 'Word and at least one meaning required');
        }

        const oldWord = await Word.findById(req.params.id);
        if (!oldWord) {
            return response.notFound(res, 'Word not found');
        }

        const formattedMeanings = meanings.map(m => ({
            partOfSpeech: m.partOfSpeech || null,
            definition: m.definition,
            synonyms: Array.isArray(m.synonyms) ? m.synonyms : [],
            examples: Array.isArray(m.examples) ? m.examples : []
        }));

        const updateData = {
            word: word.toUpperCase(),
            meanings: formattedMeanings,
            synonyms: Array.isArray(synonyms) ? synonyms : [],
            antonyms: Array.isArray(antonyms) ? antonyms : []
        };

        const updated = await Word.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        await logUpdate(RESOURCE_TYPES.DICTIONARY, updated._id, req.admin, {
            old: { word: oldWord.word },
            new: { word: updated.word }
        });

        response.success(res, updated, 'Word updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a word.
 */
const deleteWord = async (req, res, next) => {
    try {
        const word = await Word.findById(req.params.id);

        if (!word) {
            return response.notFound(res, 'Word not found');
        }

        await Word.findByIdAndDelete(req.params.id);

        await logDelete(RESOURCE_TYPES.DICTIONARY, req.params.id, req.admin, {
            word: word.word
        });

        response.success(res, null, 'Word deleted successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk upload dictionary.
 */
const uploadDictionary = async (req, res, next) => {
    try {
        const dictionaryData = req.body;

        if (!dictionaryData || typeof dictionaryData !== 'object') {
            return response.badRequest(res, 'Invalid dictionary data format');
        }

        const words = [];
        let processedCount = 0;
        let skippedCount = 0;

        for (const [wordKey, wordData] of Object.entries(dictionaryData)) {
            try {
                const meanings = wordData.MEANINGS?.map(meaning => ({
                    partOfSpeech: meaning[0] || '',
                    definition: meaning[1] || '',
                    synonyms: meaning[2] || [],
                    examples: meaning[3] || []
                })) || [];

                if (meanings.length === 0) {
                    skippedCount++;
                    continue;
                }

                words.push({
                    word: wordKey.toUpperCase(),
                    meanings,
                    antonyms: wordData.ANTONYMS || [],
                    synonyms: wordData.SYNONYMS || []
                });
                processedCount++;
            } catch (error) {
                skippedCount++;
            }
        }

        if (words.length === 0) {
            return response.badRequest(res, 'No valid words found');
        }

        const result = await Word.insertMany(words, { ordered: false });

        response.success(res, {
            totalWords: Object.keys(dictionaryData).length,
            processedWords: processedCount,
            insertedWords: result.length,
            skippedWords: skippedCount
        }, 'Dictionary uploaded successfully');
    } catch (error) {
        if (error.code === 11000) {
            const insertedCount = error.result?.insertedIds?.length || 0;
            return response.success(res, {
                insertedWords: insertedCount,
                duplicatesSkipped: error.writeErrors?.length || 0
            }, 'Dictionary uploaded with some duplicates');
        }
        next(error);
    }
};

/**
 * Export all words in the dictionary.
 */
const exportDictionary = async (req, res, next) => {
    try {
        const words = await Word.find({})
            .sort({ word: 1 })
            .lean();

        // Format into { "WORD": { MEANINGS: [...], SYNONYMS: [...], ANTONYMS: [...] } }
        // to match the bulk upload format
        const exportData = {};

        words.forEach(w => {
            exportData[w.word] = {
                MEANINGS: w.meanings.map(m => [
                    m.partOfSpeech || '',
                    m.definition,
                    m.synonyms || [],
                    m.examples || []
                ]),
                SYNONYMS: w.synonyms || [],
                ANTONYMS: w.antonyms || []
            };
        });

        response.success(res, exportData);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    lookupWord,
    getWords,
    getAllWords,
    searchWords,
    createWord,
    updateWord,
    deleteWord,
    uploadDictionary,
    exportDictionary
};
