/**
 * Abbreviation Routes
 * 
 * Defines routes for abbreviation operations.
 * Business logic is in abbreviation.controller.js.
 * 
 * @module routes/abbreviation.routes
 */

const express = require('express');
const router = express.Router();

// Controller
const abbreviationController = require('../controllers/abbreviation.controller');

// Middleware
const { unifiedAuth, authenticateAdmin, requirePermission } = require('../middleware/adminAuth');
const { validateObjectId, trimFields, requireFields } = require('../middleware/validate');

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/abbreviations
 * Search abbreviations.
 */
router.get(
    '/',
    unifiedAuth,
    abbreviationController.searchAbbreviations
);

/**
 * GET /api/abbreviations/all
 * Get all abbreviations.
 */
router.get(
    '/all',
    unifiedAuth,
    abbreviationController.getAllAbbreviations
);

/**
 * GET /api/abbreviations/:abbr
 * Look up specific abbreviation.
 */
router.get(
    '/:abbr',
    unifiedAuth,
    abbreviationController.getAbbreviation
);

/**
 * POST /api/abbreviations
 * Create new abbreviation (admin only).
 */
router.post(
    '/',
    authenticateAdmin,
    requirePermission('manage_abbreviations'),
    trimFields,
    requireFields(['abbreviation', 'fullForm']),
    abbreviationController.createAbbreviation
);

/**
 * PUT /api/abbreviations/:id
 * Update abbreviation (admin only).
 */
router.put(
    '/:id',
    authenticateAdmin,
    requirePermission('manage_abbreviations'),
    validateObjectId,
    trimFields,
    requireFields(['abbreviation', 'fullForm']),
    abbreviationController.updateAbbreviation
);

/**
 * DELETE /api/abbreviations/:id
 * Delete abbreviation (admin only).
 */
router.delete(
    '/:id',
    authenticateAdmin,
    requirePermission('manage_abbreviations'),
    validateObjectId,
    abbreviationController.deleteAbbreviation
);

module.exports = router;
