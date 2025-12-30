const express = require('express');
const router = express.Router();
const Word = require('../models/Word');
const { unifiedAuth, adminOnly } = require('../../admin_auth/middleware/unifiedAuth');
const { logAction } = require('../../admin_auth/utils/auditLogger');

// Health check for POST /api/dictionary/upload
router.get('/health/upload', (req, res) => {
  res.json({ status: 'ok', route: 'POST /api/dictionary/upload' });
});

// Health check for GET /api/dictionary/word/:word
router.get('/health/word/:word', (req, res) => {
  res.json({ status: 'ok', route: `GET /api/dictionary/word/${req.params.word}` });
});

// Health check for GET /api/dictionary/words
router.get('/health/words', (req, res) => {
  res.json({ status: 'ok', route: 'GET /api/dictionary/words' });
});

// General health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', route: '/api/dictionary' });
});

// Upload full dictionary (admin only)
router.post('/upload', adminOnly, async (req, res) => {
  try {
    const dictionaryData = req.body;
    if (!dictionaryData || typeof dictionaryData !== 'object') {
      return res.status(400).json({ error: 'Invalid dictionary data format' });
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

        const wordDoc = {
          word: wordKey.toUpperCase(),
          meanings: meanings,
          antonyms: wordData.ANTONYMS || [],
          synonyms: wordData.SYNONYMS || []
        };

        words.push(wordDoc);
        processedCount++;
      } catch (error) {
        console.log(`Skipping word ${wordKey} due to format error:`, error.message);
        skippedCount++;
      }
    }

    if (words.length > 0) {
      const result = await Word.insertMany(words, { ordered: false });
      res.json({
        message: 'Dictionary uploaded successfully',
        totalWords: Object.keys(dictionaryData).length,
        processedWords: processedCount,
        insertedWords: result.length,
        skippedWords: skippedCount,
        duplicatesSkipped: processedCount - result.length
      });
    } else {
      res.status(400).json({ error: 'No valid words found in the dictionary data' });
    }
  } catch (error) {
    console.error('Error uploading dictionary:', error);
    if (error.code === 11000) {
      const insertedCount = error.result?.result?.insertedIds ? Object.keys(error.result.result.insertedIds).length : 0;
      res.json({
        message: 'Dictionary uploaded with some duplicates',
        insertedWords: insertedCount,
        duplicatesSkipped: error.result?.writeErrors?.length || 0
      });
    } else {
      res.status(500).json({ error: 'Failed to upload dictionary', details: error.message });
    }
  }
});

// Exact match + related words
router.get('/word/:word', async (req, res) => {
  try {
    const word = req.params.word;
    if (!word) {
      return res.status(400).json({ error: 'Word parameter is required' });
    }

    const wordDoc = await Word.findOne({ word: { $regex: `^${word}$`, $options: 'i' } }).lean();
    const relatedWords = await Word.find({ word: { $regex: word, $options: 'i' } })
      .limit(20)
      .select('word')
      .lean();

    if (!wordDoc) {
      return res.status(404).json({
        error: 'Word not found',
        word: word,
        related: relatedWords.map(w => w.word)
      });
    }

    res.json({
      word: wordDoc.word,
      meanings: wordDoc.meanings,
      synonyms: wordDoc.synonyms,
      antonyms: wordDoc.antonyms,
      related: relatedWords
        .map(w => w.word)
        .filter(w => w.toLowerCase() !== word.toLowerCase())
    });
  } catch (error) {
    console.error('Error retrieving word:', error);
    res.status(500).json({ error: 'Failed to retrieve word meaning' });
  }
});

// Get all words (authenticated users can read, admin can manage)
router.get('/words/all', unifiedAuth, async (req, res) => {
  try {
    const words = await Word.find({}).sort({ word: 1 });
    res.json({ success: true, data: words });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/dictionary (add word - admin only)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { word, meanings, synonyms, antonyms } = req.body;
    if (!word || !meanings || !Array.isArray(meanings) || meanings.length === 0 || !meanings[0].definition) {
      return res.status(400).json({ success: false, error: 'Word and at least one definition are required' });
    }

    const existing = await Word.findOne({ word: word.toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Word already exists' });
    }

    const formattedMeanings = meanings.map(m => ({
      partOfSpeech: m.partOfSpeech || null,
      definition: m.definition,
      synonyms: Array.isArray(m.synonyms) && m.synonyms.length ? m.synonyms : null,
      examples: Array.isArray(m.examples) && m.examples.length ? m.examples : null
    }));

    const newWord = new Word({
      word: word.toUpperCase(),
      meanings: formattedMeanings,
      synonyms: Array.isArray(synonyms) && synonyms.length ? synonyms : null,
      antonyms: Array.isArray(antonyms) && antonyms.length ? antonyms : null
    });

    await newWord.save();
    
    // Log audit action
    await logAction('CREATE', 'DICTIONARY_WORD', newWord._id, req.admin, {
      word: newWord.word,
      definition: newWord.meanings[0]?.definition
    });
    
    res.status(201).json({ success: true, message: 'Word added successfully', data: newWord });
  } catch (error) {
    console.error('Error adding word:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/dictionary/:id (update word - admin only)
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { word, meanings, synonyms, antonyms } = req.body;
    if (!word || !meanings || !Array.isArray(meanings) || meanings.length === 0 || !meanings[0].definition) {
      return res.status(400).json({ success: false, error: 'Word and at least one definition are required' });
    }

    const formattedMeanings = meanings.map(m => ({
      partOfSpeech: m.partOfSpeech || null,
      definition: m.definition,
      synonyms: Array.isArray(m.synonyms) && m.synonyms.length ? m.synonyms : null,
      examples: Array.isArray(m.examples) && m.examples.length ? m.examples : null
    }));

    const updateData = {
      word: word.toUpperCase(),
      meanings: formattedMeanings,
      synonyms: Array.isArray(synonyms) && synonyms.length ? synonyms : null,
      antonyms: Array.isArray(antonyms) && antonyms.length ? antonyms : null
    };

    // Get old data for audit log
    const oldData = await Word.findById(req.params.id);
    if (!oldData) {
      return res.status(404).json({ success: false, error: 'Word not found' });
    }

    const updated = await Word.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    // Log audit action
    await logAction('UPDATE', 'DICTIONARY_WORD', updated._id, req.admin, {
      old: oldData ? { word: oldData.word, definition: oldData.meanings[0]?.definition } : null,
      new: { word: updated.word, definition: updated.meanings[0]?.definition }
    });

    res.json({ success: true, message: 'Word updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating word:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/dictionary/:id (admin only)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    // Get data before deletion for audit log
    const toDelete = await Word.findById(req.params.id);
    if (!toDelete) {
      return res.status(404).json({ success: false, error: 'Word not found' });
    }
    
    const deleted = await Word.findByIdAndDelete(req.params.id);
    
    // Log audit action
    await logAction('DELETE', 'DICTIONARY_WORD', deleted._id, req.admin, {
      word: deleted.word,
      definition: deleted.meanings[0]?.definition
    });
    res.json({ success: true, message: 'Word deleted successfully' });
  } catch (error) {
    console.error('Error deleting word:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get first 100 words (authenticated users can read)
router.get('/words', unifiedAuth, async (req, res) => {
  try {
    const words = await Word.find().limit(100).select('word').lean();
    res.json({
      total: words.length,
      words: words.map(w => w.word)
    });
  } catch (error) {
    console.error('Error retrieving words:', error);
    res.status(500).json({ error: 'Failed to retrieve words' });
  }
});

// Partial search for words with full info (meanings, etc.) - authenticated users can read
router.get('/search/:term', unifiedAuth, async (req, res) => {
  try {
    const searchTerm = req.params.term;
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    const regex = new RegExp(searchTerm, 'i');
    const results = await Word.find({ word: regex })
      .limit(20)
      .lean();

    res.json({
      total: results.length,
      words: results
    });
  } catch (error) {
    console.error('Error searching words:', error);
    res.status(500).json({ error: 'Failed to search words' });
  }
});
module.exports = router;
