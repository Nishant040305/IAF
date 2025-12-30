const express = require("express");
const Abbreviation = require("../models/achro");
const router = express.Router();
const { unifiedAuth, adminOnly } = require("../../admin_auth/middleware/unifiedAuth");
const { logAction } = require("../../admin_auth/utils/auditLogger");

// Health check for POST
router.get("/health/post", (req, res) => {
  res.json({ status: "ok", route: "POST /api/abbreviations" });
});

// Health check for GET all
router.get("/health/all", (req, res) => {
  res.json({ status: "ok", route: "GET /api/abbreviations/all" });
});

// Health check for GET by abbreviation
router.get("/health/:abbr", (req, res) => {
  res.json({ status: "ok", route: `GET /api/abbreviations/${req.params.abbr}` });
});

// POST /api/abbreviations (admin only)
router.post("/", adminOnly, async (req, res) => {
  try {
    const { abbreviation, fullForm } = req.body;
    if (!abbreviation || !fullForm) {
      return res.status(400).json({ success: false, error: "Abbreviation and fullForm are required" });
    }
    const newAbbreviation = new Abbreviation({ abbreviation, fullForm });
    const savedAbbreviation = await newAbbreviation.save();
    
    // Log audit action
    await logAction('CREATE', 'ABBREVIATION', savedAbbreviation._id, req.admin, {
      abbreviation: savedAbbreviation.abbreviation,
      fullForm: savedAbbreviation.fullForm
    });
    
    res.status(201).json({ success: true, data: savedAbbreviation });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

//GET /api/abbreviations/all (authenticated users can read, admin can manage)
router.get("/all", unifiedAuth, async (req, res) => {
  try {
    const abbreviations = await Abbreviation.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: abbreviations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/abbreviations/:id (admin only)
router.put("/:id", adminOnly, async (req, res) => {
  try {
    const { abbreviation, fullForm } = req.body;
    if (!abbreviation || !fullForm) {
      return res.status(400).json({ success: false, error: "Abbreviation and fullForm are required" });
    }
    
    // Get old data for audit log
    const oldData = await Abbreviation.findById(req.params.id);
    
    const updated = await Abbreviation.findByIdAndUpdate(
      req.params.id,
      { abbreviation, fullForm },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: "Abbreviation not found" });
    }
    
    // Log audit action
    await logAction('UPDATE', 'ABBREVIATION', updated._id, req.admin, {
      old: oldData ? { abbreviation: oldData.abbreviation, fullForm: oldData.fullForm } : null,
      new: { abbreviation: updated.abbreviation, fullForm: updated.fullForm }
    });
    
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/abbreviations/:id (admin only)
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    // Get data before deletion for audit log
    const toDelete = await Abbreviation.findById(req.params.id);
    if (!toDelete) {
      return res.status(404).json({ success: false, error: "Abbreviation not found" });
    }
    
    const deleted = await Abbreviation.findByIdAndDelete(req.params.id);
    
    // Log audit action
    await logAction('DELETE', 'ABBREVIATION', deleted._id, req.admin, {
      abbreviation: deleted.abbreviation,
      fullForm: deleted.fullForm
    });
    
    res.json({ success: true, message: "Abbreviation deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/abbreviations/:abbr (authenticated users can read)
router.get("/:abbr", unifiedAuth, async (req, res) => {
  try {
    const abbr = req.params.abbr;
    const result = await Abbreviation.findOne({ abbreviation: new RegExp(`^${abbr}$`, "i") });
    if (!result) {
      return res.status(404).json({ error: "Abbreviation not found" });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
