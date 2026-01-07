/**
 * PDF Controller
 * 
 * Handles PDF document CRUD business logic.
 * 
 * @module controllers/pdf.controller
 */

const path = require('path');
const fs = require('fs').promises;
const PdfDocument = require('../models/PdfDocument');
const { logCreate, logUpdate, logDelete, RESOURCE_TYPES } = require('../services/audit.service');
const response = require('../utils/response');
const { escapeRegex } = require('../utils/sanitize');

const { redisClient } = require('../config/redis');

// Cache TTL constants (in seconds)
const CACHE_TTL = {
    PDF_METADATA: 3600,      // 1 hour for individual PDF metadata
    CATEGORIES: 3600,        // 1 hour for categories list
    PDF_LIST: 1800,          // 30 minutes for PDF listings
    SEARCH_RESULTS: 900      // 15 minutes for search results
};

/**
 * Search PDFs with optional query and pagination.
 * Query params: search, page (default 1), limit (default 50, max 200)
 */
const searchPdfs = async (req, res, next) => {
    try {
        const { search } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;

        let query = {};
        if (search) {
            const safeSearch = escapeRegex(search);
            query = {
                $or: [
                    { title: { $regex: safeSearch, $options: 'i' } },
                    { content: { $regex: safeSearch, $options: 'i' } },
                    { category: { $regex: safeSearch, $options: 'i' } }
                ]
            };
        }

        const [documents, total] = await Promise.all([
            PdfDocument.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            PdfDocument.countDocuments(query)
        ]);

        response.success(res, {
            documents,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

const getAllPdfs = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;
        const { category } = req.query;

        const query = {};
        if (category) {
            query.category = category;
        }

        const [documents, total] = await Promise.all([
            PdfDocument.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            PdfDocument.countDocuments(query)
        ]);

        response.success(res, {
            documents,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get distinct PDF categories.
 * Cached for 1 hour.
 */
const getCategories = async (req, res, next) => {
    try {
        const cacheKey = 'pdf:categories';

        // Check cache first
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return response.success(res, JSON.parse(cachedData));
        }

        const categories = await PdfDocument.distinct('category');
        const result = categories.filter(c => c).sort();

        // Cache for 1 hour
        await redisClient.set(cacheKey, JSON.stringify(result), { EX: CACHE_TTL.CATEGORIES });

        response.success(res, result);
    } catch (error) {
        next(error);
    }
};

/**
 * Get single PDF and increment view count.
 */
const getPdfById = async (req, res, next) => {
    try {
        const pdf = await PdfDocument.findByIdAndUpdate(
            req.params.id,
            { $inc: { viewCount: 1 } },
            { new: true }
        );

        if (!pdf) {
            return response.notFound(res, 'PDF not found');
        }

        response.success(res, pdf);
    } catch (error) {
        next(error);
    }
};

/**
 * Upload new PDF.
 */
const uploadPdf = async (req, res, next) => {
    try {
        const { title, content, category } = req.body;
        const pdfFile = req.files?.pdf?.[0];
        const thumbnailFile = req.files?.thumbnail?.[0];

        if (!pdfFile) {
            return response.badRequest(res, 'PDF file is required');
        }

        if (!title) {
            return response.badRequest(res, 'Title is required');
        }

        const pdfUrl = `/uploads/${req.folderName}/${pdfFile.filename}`;
        const thumbnail = thumbnailFile
            ? `/uploads/${req.folderName}/${thumbnailFile.filename}`
            : undefined;

        const newDoc = new PdfDocument({
            title,
            content,
            pdfUrl,
            category,
            thumbnail,
            viewCount: 0
        });

        await newDoc.save();

        await logCreate(RESOURCE_TYPES.PDF, newDoc._id, req.admin, {
            title: newDoc.title,
            category: newDoc.category
        });

        response.created(res, newDoc, 'PDF uploaded successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Update PDF.
 */
const updatePdf = async (req, res, next) => {
    try {
        const { title, content, category } = req.body;
        const pdfFile = req.files?.pdf?.[0];
        const thumbnailFile = req.files?.thumbnail?.[0];

        const oldDoc = await PdfDocument.findById(req.params.id);
        if (!oldDoc) {
            return response.notFound(res, 'PDF not found');
        }

        const updateData = {};
        if (title) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (category !== undefined) updateData.category = category;

        if (pdfFile) {
            updateData.pdfUrl = `/uploads/${req.folderName}/${pdfFile.filename}`;
        }

        if (thumbnailFile) {
            updateData.thumbnail = `/uploads/${req.folderName}/${thumbnailFile.filename}`;
        }

        const updated = await PdfDocument.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        await logUpdate(RESOURCE_TYPES.PDF, updated._id, req.admin, {
            old: { title: oldDoc.title },
            new: { title: updated.title }
        });

        response.success(res, updated, 'PDF updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Delete PDF (async file operations).
 */
const deletePdf = async (req, res, next) => {
    try {
        const pdf = await PdfDocument.findById(req.params.id);

        if (!pdf) {
            return response.notFound(res, 'PDF not found');
        }

        // Delete files asynchronously (non-blocking)
        const deleteFile = async (filePath) => {
            try {
                await fs.unlink(filePath);
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error('Error deleting file:', filePath, err.message);
                }
            }
        };

        const deleteEmptyFolder = async (folderPath) => {
            try {
                const files = await fs.readdir(folderPath);
                if (files.length === 0) {
                    await fs.rmdir(folderPath);
                }
            } catch (err) {
                // Ignore folder deletion errors
            }
        };

        // Delete files in parallel
        const deleteTasks = [];
        if (pdf.pdfUrl) {
            const pdfPath = path.join(__dirname, '..', '..', pdf.pdfUrl);
            deleteTasks.push(deleteFile(pdfPath).then(() => deleteEmptyFolder(path.dirname(pdfPath))));
        }
        if (pdf.thumbnail) {
            const thumbPath = path.join(__dirname, '..', '..', pdf.thumbnail);
            deleteTasks.push(deleteFile(thumbPath));
        }

        // Don't wait for file deletion to complete - fire and forget
        Promise.all(deleteTasks).catch(err => {
            console.error('Background file deletion error:', err.message);
        });

        await PdfDocument.findByIdAndDelete(req.params.id);

        await logDelete(RESOURCE_TYPES.PDF, req.params.id, req.admin, {
            title: pdf.title
        });

        response.success(res, null, 'PDF deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    searchPdfs,
    getAllPdfs,
    getPdfById,
    uploadPdf,
    updatePdf,
    deletePdf,
    getCategories
};
