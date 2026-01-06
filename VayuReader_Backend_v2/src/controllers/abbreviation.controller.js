/**
 * Abbreviation Controller
 * 
 * Handles abbreviation CRUD business logic.
 * 
 * @module controllers/abbreviation.controller
 */

const Abbreviation = require('../models/Abbreviation');
const { logCreate, logUpdate, logDelete, RESOURCE_TYPES } = require('../services/audit.service');
const response = require('../utils/response');
const { escapeRegex, createExactMatchRegex } = require('../utils/sanitize');

/**
 * Search abbreviations.
 */
const searchAbbreviations = async (req, res, next) => {
    try {
        const { search } = req.query;
        let query = {};

        if (search) {
            const safeSearch = escapeRegex(search);
            query = {
                $or: [
                    { abbreviation: { $regex: safeSearch, $options: 'i' } },
                    { fullForm: { $regex: safeSearch, $options: 'i' } }
                ]
            };
        }

        const abbreviations = await Abbreviation.find(query)
            .sort({ abbreviation: 1 })
            .lean();

        response.success(res, abbreviations);
    } catch (error) {
        next(error);
    }
};

/**
 * Get all abbreviations.
 */
const getAllAbbreviations = async (req, res, next) => {
    try {
        const abbreviations = await Abbreviation.find({})
            .sort({ createdAt: -1 })
            .lean();

        response.success(res, abbreviations);
    } catch (error) {
        next(error);
    }
};

/**
 * Look up specific abbreviation.
 */
const getAbbreviation = async (req, res, next) => {
    try {
        const abbr = req.params.abbr;

        if (!abbr) {
            return response.badRequest(res, 'Abbreviation parameter is required');
        }

        const result = await Abbreviation.findOne({
            abbreviation: createExactMatchRegex(abbr)
        }).lean();

        if (!result) {
            return response.notFound(res, 'Abbreviation not found');
        }

        response.success(res, result);
    } catch (error) {
        next(error);
    }
};

/**
 * Create new abbreviation.
 */
const createAbbreviation = async (req, res, next) => {
    try {
        const { abbreviation, fullForm } = req.body;

        // Check for existing
        const existing = await Abbreviation.findOne({
            abbreviation: abbreviation.toUpperCase()
        });

        if (existing) {
            return response.conflict(res, 'Abbreviation already exists');
        }

        const newAbbr = new Abbreviation({
            abbreviation: abbreviation.toUpperCase(),
            fullForm
        });

        await newAbbr.save();

        await logCreate(RESOURCE_TYPES.ABBREVIATION, newAbbr._id, req.admin, {
            abbreviation: newAbbr.abbreviation,
            fullForm: newAbbr.fullForm
        });

        response.created(res, newAbbr, 'Abbreviation created successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Update abbreviation.
 */
const updateAbbreviation = async (req, res, next) => {
    try {
        const { abbreviation, fullForm } = req.body;

        const oldAbbr = await Abbreviation.findById(req.params.id);
        if (!oldAbbr) {
            return response.notFound(res, 'Abbreviation not found');
        }

        const updated = await Abbreviation.findByIdAndUpdate(
            req.params.id,
            {
                abbreviation: abbreviation.toUpperCase(),
                fullForm
            },
            { new: true, runValidators: true }
        );

        await logUpdate(RESOURCE_TYPES.ABBREVIATION, updated._id, req.admin, {
            old: { abbreviation: oldAbbr.abbreviation, fullForm: oldAbbr.fullForm },
            new: { abbreviation: updated.abbreviation, fullForm: updated.fullForm }
        });

        response.success(res, updated, 'Abbreviation updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Delete abbreviation.
 */
const deleteAbbreviation = async (req, res, next) => {
    try {
        const abbr = await Abbreviation.findById(req.params.id);

        if (!abbr) {
            return response.notFound(res, 'Abbreviation not found');
        }

        await Abbreviation.findByIdAndDelete(req.params.id);

        await logDelete(RESOURCE_TYPES.ABBREVIATION, req.params.id, req.admin, {
            abbreviation: abbr.abbreviation
        });

        response.success(res, null, 'Abbreviation deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    searchAbbreviations,
    getAllAbbreviations,
    getAbbreviation,
    createAbbreviation,
    updateAbbreviation,
    deleteAbbreviation
};
