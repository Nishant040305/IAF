const Abbreviation = require('../models/Abbreviation');

const addAbbreviation = async (req, res) => {
  try {
    const { abbreviation, meaning } = req.body;

    if (!abbreviation || !meaning) {
      return res.status(400).json({ success: false, msg: 'Both abbreviation and meaning are required' });
    }

    const existing = await Abbreviation.findOne({ abbreviation });
    if (existing) {
      return res.status(409).json({ success: false, msg: 'Abbreviation already exists' });
    }

    const newEntry = new Abbreviation({ abbreviation, meaning });
    await newEntry.save();

    res.status(201).json({ success: true, msg: 'Abbreviation saved successfully', data: newEntry });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
};

const updateAbbreviation = async (req, res) => {
  try {
    const { id } = req.params;
    const { abbreviation, meaning } = req.body;

    if (!abbreviation || !meaning) {
      return res.status(400).json({ success: false, msg: 'Both abbreviation and meaning are required' });
    }

    const updated = await Abbreviation.findByIdAndUpdate(
      id,
      { abbreviation, meaning },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, msg: 'Abbreviation not found' });
    }

    res.json({ success: true, msg: 'Abbreviation updated successfully', data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
};

const deleteAbbreviation = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Abbreviation.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, msg: 'Abbreviation not found' });
    }

    res.json({ success: true, msg: 'Abbreviation deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
};

const getAllAbbreviations = async (req, res) => {
  try {
    const abbreviations = await Abbreviation.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: abbreviations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
};

module.exports = { addAbbreviation, updateAbbreviation, deleteAbbreviation, getAllAbbreviations };
