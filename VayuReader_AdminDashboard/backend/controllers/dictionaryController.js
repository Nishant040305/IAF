const Dictionary = require('../models/DictionaryWord');

const addDictionaryWord = async (req, res) => {
try {
const { word, meanings, synonyms, antonyms } = req.body;

if (!word || !meanings || !Array.isArray(meanings) || meanings.length === 0 || !meanings[0].definition) {
  return res.status(400).json({ msg: 'Word and at least one definition are required' });
}

const existing = await Dictionary.findOne({ word });
if (existing) {
  return res.status(409).json({ msg: 'Word already exists' });
}


const formattedMeanings = meanings.map(m => ({
  partOfSpeech: m.partOfSpeech || null,
  definition: m.definition,
  synonyms: Array.isArray(m.synonyms) && m.synonyms.length ? m.synonyms : null,
  examples: Array.isArray(m.examples) && m.examples.length ? m.examples : null
}));

const newWord = new Dictionary({
  word,
  meanings: formattedMeanings,
  synonyms: Array.isArray(synonyms) && synonyms.length ? synonyms : null,
  antonyms: Array.isArray(antonyms) && antonyms.length ? antonyms : null
});

await newWord.save();
res.status(201).json({ msg: '✅ Word added successfully' });
} catch (error) {
console.error('Error adding dictionary word:', error);
res.status(500).json({ msg: 'Server error' });
}
};

const updateDictionaryWord = async (req, res) => {
  try {
    const { id } = req.params;
    const { word, meanings, synonyms, antonyms } = req.body;

    if (!word || !meanings || !Array.isArray(meanings) || meanings.length === 0 || !meanings[0].definition) {
      return res.status(400).json({ success: false, msg: 'Word and at least one definition are required' });
    }

    const formattedMeanings = meanings.map(m => ({
      partOfSpeech: m.partOfSpeech || null,
      definition: m.definition,
      synonyms: Array.isArray(m.synonyms) && m.synonyms.length ? m.synonyms : null,
      examples: Array.isArray(m.examples) && m.examples.length ? m.examples : null
    }));

    const updateData = {
      word,
      meanings: formattedMeanings,
      synonyms: Array.isArray(synonyms) && synonyms.length ? synonyms : null,
      antonyms: Array.isArray(antonyms) && antonyms.length ? antonyms : null
    };

    const updated = await Dictionary.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!updated) {
      return res.status(404).json({ success: false, msg: 'Word not found' });
    }

    res.json({ success: true, msg: 'Word updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating dictionary word:', error);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
};

const deleteDictionaryWord = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Dictionary.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, msg: 'Word not found' });
    }

    res.json({ success: true, msg: 'Word deleted successfully' });
  } catch (error) {
    console.error('Error deleting dictionary word:', error);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
};

const getAllDictionaryWords = async (req, res) => {
  try {
    const words = await Dictionary.find({}).sort({ word: 1 });
    res.json({ success: true, data: words });
  } catch (error) {
    console.error('Error fetching dictionary words:', error);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
};

module.exports = { addDictionaryWord, updateDictionaryWord, deleteDictionaryWord, getAllDictionaryWords };
