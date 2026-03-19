/**
 * PDF Controller
 *
 * Handles PDF document CRUD business logic.
 *
 * @module controllers/pdf.controller
 */

const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const { PdfDocumentRepository } = require('../repositories');
const { logCreate, logUpdate, logDelete, RESOURCE_TYPES } = require('../services/audit.service');
const { publishPdfEvent, PDF_EVENTS } = require('../services/pubsub.service');
const { logPdfRead } = require('../services/userAudit.service');
const response = require('../utils/response');
const { sanitizeTag } = require('../utils/sanitize');
const { validateFileType, ALLOWED_TYPES, validateExtensionMatchesContent, validateSafeFilename } = require('../utils/fileValidator');
const { sanitizePdfBuffer, sanitizePdfInPlace } = require('../utils/pdfSanitizer');
const { generateThumbnail } = require('../services/thumbnail.service');
const { redisClient } = require('../config/redis');
const { v4: uuidv4 } = require('uuid');
const { minio: minioConfig } = require('../config/environment');
const { uploadObject, deleteObject, getPresignedUrl } = require('../config/minio');

// Cache TTL constants (in seconds)
const CACHE_TTL = {
    PDF_METADATA: 3600,
    CATEGORIES: 3600,
    PDF_LIST: 1800,
    SEARCH_RESULTS: 900
};

const FILE_URL_TTL_SECONDS = (() => {
    const parsed = parseInt(process.env.FILE_URL_TTL_SECONDS || '60', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
})();

// Only used in disk mode — nginx secure_link signing
const FILE_URL_SECRET = (process.env.FILE_URL_SECRET || '')
    .trim()
    .replace(/^"(.*)"$/, '$1')
    .replace(/^'(.*)'$/, '$1');

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Cleans up a temp file left on disk by multer diskStorage.
 * No-op in memory storage mode (buffer is GC'd automatically).
 */
const cleanupUpload = async (file) => {
    if (file?.path) {
        await fs.unlink(file.path).catch(() => { });
    }
};

/**
 * Validate, sanitize, and generate thumbnail for an uploaded PDF.
 * Works in both disk (path) and memory (buffer) modes.
 *
 * Returns { sanitizedBuffer } in MinIO mode.
 * Returns { thumbnailPath, pdfUrl } in disk mode (mutates file on disk in-place).
 *
 * Throws on any security/validation failure — caller must handle cleanup.
 */
const processPdfFile = async (pdfFile, folderName) => {
    const nameCheck = validateSafeFilename(pdfFile.originalname);
    if (!nameCheck.valid) {
        throw Object.assign(new Error(`PDF file rejected: ${nameCheck.error}`), { statusCode: 400 });
    }

    if (minioConfig.enable) {
        // --- Memory buffer path ---
        const validPdf = await validateFileType(pdfFile.buffer, ALLOWED_TYPES.pdf);
        if (!validPdf.valid) {
            throw Object.assign(
                new Error(`Invalid PDF file content. Detected: ${validPdf.type?.mime ?? 'unknown 1'}`),
                { statusCode: 400 }
            );
        }

        const extCheck = await validateExtensionMatchesContent(pdfFile.originalname, pdfFile.buffer);
        if (!extCheck.valid) {
            throw Object.assign(new Error(`Security Warning: ${extCheck.error}`), { statusCode: 400 });
        }

        const sanitizedBuffer = await sanitizePdfBuffer(pdfFile.buffer);

        const revalidate = await validateFileType(sanitizedBuffer, ALLOWED_TYPES.pdf);
        if (!revalidate.valid) {
            throw Object.assign(new Error('PDF rejected: Sanitized output is invalid'), { statusCode: 400 });
        }

        const thumbnailBuffer = await generateThumbnail(sanitizedBuffer);

        return { sanitizedBuffer, thumbnailBuffer };

    } else {
        // --- Disk path ---
        const validPdf = await validateFileType(pdfFile.path, ALLOWED_TYPES.pdf);
        if (!validPdf.valid) {
            throw Object.assign(
                new Error(`Invalid PDF file content. Detected: ${validPdf.type?.mime ?? 'unknown 2'}`),
                { statusCode: 400 }
            );
        }

        const extCheck = await validateExtensionMatchesContent(pdfFile.originalname, pdfFile.path);
        if (!extCheck.valid) {
            throw Object.assign(new Error(`Security Warning: ${extCheck.error}`), { statusCode: 400 });
        }

        await sanitizePdfInPlace(pdfFile.path);

        const revalidate = await validateFileType(pdfFile.path, ALLOWED_TYPES.pdf);
        if (!revalidate.valid) {
            throw Object.assign(new Error('PDF rejected: Sanitized output is invalid'), { statusCode: 400 });
        }

        const uploadDir = path.join(__dirname, '..', '..', 'uploads', folderName);
        const { thumbnailFilename } = await generateThumbnail(pdfFile.path, uploadDir);

        return {
            pdfUrl: `/uploads/${folderName}/${pdfFile.filename}`,
            thumbnailUrl: `/uploads/${folderName}/${thumbnailFilename}`
        };
    }
};

/**
 * Upload processed buffers to MinIO, returns stored keys.
 */
const uploadToMinio = async (sanitizedBuffer, thumbnailBuffer) => {
    const folder = uuidv4();
    const pdfKey = `pdfs/${folder}/${uuidv4()}.pdf`;
    const thumbnailKey = `pdfs/${folder}/${uuidv4()}.jpg`;

    await Promise.all([
        uploadObject(pdfKey, sanitizedBuffer, 'application/pdf'),
        uploadObject(thumbnailKey, thumbnailBuffer, 'image/jpeg'),
    ]);

    return { pdfKey, thumbnailKey };
};

/**
 * Delete old MinIO objects (fire-and-forget).
 */
const deleteMinioObjects = (...keys) => {
    Promise.all(keys.filter(Boolean).map(k => deleteObject(k)))
        .catch(err => console.error('MinIO cleanup error:', err.message));
};

/**
 * Delete old disk files (fire-and-forget).
 */
const deleteDiskFiles = (...filePaths) => {
    const deleteOne = async (filePath) => {
        try {
            await fs.unlink(filePath);
            const dir = path.dirname(filePath);
            const remaining = await fs.readdir(dir);
            if (remaining.length === 0) await fs.rmdir(dir);
        } catch (e) { /* ignore */ }
    };
    Promise.all(filePaths.filter(Boolean).map(p =>
        deleteOne(path.join(__dirname, '..', '..', p))
    )).catch(err => console.error('Disk cleanup error:', err.message));
};

// Nginx secure_link signing — disk mode only
const generateNginxSignedUrl = (filePath, expiresAtSeconds = null) => {
    if (!FILE_URL_SECRET) throw new Error('FILE_URL_SECRET is not configured');
    if (!filePath.startsWith('/uploads/')) throw new Error('filePath must start with /uploads/');

    const expires = expiresAtSeconds ?? Math.floor(Date.now() / 1000) + FILE_URL_TTL_SECONDS;
    const signature = crypto
        .createHash('md5')
        .update(`${expires}${filePath}:${FILE_URL_SECRET}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');

    return `${filePath}?expires=${expires}&signature=${signature}`;
};

// =============================================================================
// CONTROLLERS
// =============================================================================

const searchPdfs = async (req, res, next) => {
    try {
        const { search } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));

        const { documents, total } = await PdfDocumentRepository.searchWithPagination(search, page, limit);

        response.success(res, {
            documents,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
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
        const query = req.query.category ? { category: req.query.category } : {};

        const [documents, total] = await Promise.all([
            PdfDocumentRepository.find(query, { sort: { createdAt: -1 }, skip, limit }),
            PdfDocumentRepository.count(query)
        ]);

        response.success(res, {
            documents,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
};

const getCategories = async (req, res, next) => {
    try {
        const cacheKey = 'pdf:categories';
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) return response.success(res, JSON.parse(cachedData));

        const categories = await PdfDocumentRepository.distinct('category');
        const result = categories.filter(Boolean).sort();

        await redisClient.set(cacheKey, JSON.stringify(result), { EX: CACHE_TTL.CATEGORIES });
        response.success(res, result);
    } catch (error) {
        next(error);
    }
};

const getPdfById = async (req, res, next) => {
    try {
        const pdf = req.admin
            ? await PdfDocumentRepository.findById(req.params.id)
            : await PdfDocumentRepository.incrementViewCount(req.params.id);

        if (!pdf) return response.notFound(res, 'PDF not found');

        if (req.user?.userId) {
            logPdfRead(
                { userId: req.user.userId, phone_number: req.user.phone_number },
                req.user.deviceId,
                { pdfId: (pdf._id || pdf.id).toString(), title: pdf.title }
            );
        }

        response.success(res, pdf);
    } catch (error) {
        next(error);
    }
};

const getAdminPdfById = async (req, res, next) => {
    try {
        const pdf = await PdfDocumentRepository.findById(req.params.id);
        if (!pdf) return response.notFound(res, 'PDF not found');
        response.success(res, pdf);
    } catch (error) {
        next(error);
    }
};

const uploadPdf = async (req, res, next) => {
    const pdfFile = req.file;
    try {
        let { title, content, category } = req.body;

        if (!pdfFile) return response.badRequest(res, 'PDF file is required');
        if (!title) return response.badRequest(res, 'Title is required');

        // Input sanitization
        if (category) {
            const check = sanitizeTag(category);
            if (!check.valid) return response.badRequest(res, `Invalid category: ${check.error}`);
            category = check.sanitized;
        }
        const titleCheck = sanitizeTag(title);
        if (!titleCheck.valid) return response.badRequest(res, `Invalid title: ${titleCheck.error}`);
        title = titleCheck.sanitized;

        if (content) {
            const check = sanitizeTag(content);
            if (!check.valid) return response.badRequest(res, `Invalid content: ${check.error}`);
            content = check.sanitized;
        }

        // Validate, sanitize, thumbnail — throws on failure
        let pdfUrl, thumbnail;
        try {
            if (minioConfig.enable) {
                const { sanitizedBuffer, thumbnailBuffer } = await processPdfFile(pdfFile, null);
                const { pdfKey, thumbnailKey } = await uploadToMinio(sanitizedBuffer, thumbnailBuffer);
                pdfUrl = pdfKey;
                thumbnail = thumbnailKey;
            } else {
                const result = await processPdfFile(pdfFile, req.folderName);
                pdfUrl = result.pdfUrl;
                thumbnail = result.thumbnailUrl;
            }
        } catch (processError) {
            await cleanupUpload(pdfFile);
            // Log sanitization failures specifically
            if (processError.message.includes('Sanitization failed')) {
                await logCreate(RESOURCE_TYPES.PDF, null, req.admin, {
                    action: 'UPLOAD_BLOCKED',
                    reason: 'pdf_sanitization_failed',
                    filename: pdfFile.originalname,
                    error: processError.message
                }).catch(() => { });
            }
            return response.badRequest(res, processError.message);
        }

        const newDoc = await PdfDocumentRepository.create({
            title, content, pdfUrl, category, thumbnail, viewCount: 0
        });

        await logCreate(RESOURCE_TYPES.PDF, newDoc._id, req.admin, {
            title: newDoc.title, category: newDoc.category
        });
        await publishPdfEvent(PDF_EVENTS.ADDED, { id: (newDoc._id || newDoc.id).toString() });
        await redisClient.del('pdf:categories');

        response.created(res, newDoc, 'PDF uploaded successfully');
    } catch (error) {
        await cleanupUpload(pdfFile);
        next(error);
    }
};

const updatePdf = async (req, res, next) => {
    const pdfFile = req.file;
    try {
        let { title, content, category } = req.body;

        if (!title) return response.badRequest(res, 'Title is required');
        if (!category) return response.badRequest(res, 'Category is required');

        const oldDoc = await PdfDocumentRepository.findById(req.params.id);
        if (!oldDoc) return response.notFound(res, 'PDF not found');

        // Input sanitization
        const categoryCheck = sanitizeTag(category);
        if (!categoryCheck.valid) return response.badRequest(res, `Invalid category: ${categoryCheck.error}`);
        category = categoryCheck.sanitized;

        const titleCheck = sanitizeTag(title);
        if (!titleCheck.valid) return response.badRequest(res, `Invalid title: ${titleCheck.error}`);
        title = titleCheck.sanitized;

        if (content) {
            const check = sanitizeTag(content);
            if (!check.valid) return response.badRequest(res, `Invalid content: ${check.error}`);
            content = check.sanitized;
        }

        const updateData = { title, category };
        if (content !== undefined) updateData.content = content;

        if (pdfFile) {
            try {
                if (minioConfig.enable) {
                    const { sanitizedBuffer, thumbnailBuffer } = await processPdfFile(pdfFile, null);
                    const { pdfKey, thumbnailKey } = await uploadToMinio(sanitizedBuffer, thumbnailBuffer);
                    updateData.pdfUrl = pdfKey;
                    updateData.thumbnail = thumbnailKey;
                    // Delete old MinIO objects
                    deleteMinioObjects(oldDoc.pdfUrl || oldDoc.pdf_url, oldDoc.thumbnail);
                } else {
                    const result = await processPdfFile(pdfFile, req.folderName);
                    updateData.pdfUrl = result.pdfUrl;
                    updateData.thumbnail = result.thumbnailUrl;
                    // Delete old disk files
                    deleteDiskFiles(oldDoc.pdfUrl || oldDoc.pdf_url, oldDoc.thumbnail);
                }
            } catch (processError) {
                await cleanupUpload(pdfFile);
                if (processError.message.includes('Sanitization failed')) {
                    await logUpdate(RESOURCE_TYPES.PDF, req.params.id, req.admin, {
                        action: 'UPDATE_BLOCKED',
                        reason: 'pdf_sanitization_failed',
                        filename: pdfFile.originalname,
                        error: processError.message
                    }).catch(() => { });
                }
                return response.badRequest(res, processError.message);
            }
        }

        const updated = await PdfDocumentRepository.updateById(req.params.id, updateData);

        await logUpdate(RESOURCE_TYPES.PDF, updated._id, req.admin, {
            old: { title: oldDoc.title },
            new: { title: updated.title }
        });
        await publishPdfEvent(PDF_EVENTS.UPDATED, { id: (updated._id || updated.id).toString() });
        await redisClient.del('pdf:categories');

        response.success(res, updated, 'PDF updated successfully');
    } catch (error) {
        await cleanupUpload(pdfFile);
        next(error);
    }
};

const deletePdf = async (req, res, next) => {
    try {
        const pdf = await PdfDocumentRepository.findById(req.params.id);
        if (!pdf) return response.notFound(res, 'PDF not found');

        const pdfUrl = pdf.pdfUrl || pdf.pdf_url;

        if (minioConfig.enable) {
            deleteMinioObjects(pdfUrl, pdf.thumbnail);
        } else {
            deleteDiskFiles(pdfUrl, pdf.thumbnail);
        }

        await PdfDocumentRepository.deleteById(req.params.id);
        await logDelete(RESOURCE_TYPES.PDF, req.params.id, req.admin, { title: pdf.title });
        await publishPdfEvent(PDF_EVENTS.DELETED, { id: req.params.id, title: pdf.title });
        await redisClient.del('pdf:categories');

        response.success(res, null, 'PDF deleted successfully');
    } catch (error) {
        next(error);
    }
};

const getSignedFileUrl = async (req, res, next) => {
    try {
        const { folder, filename } = req.params;

        if (folder.includes('..') || folder.includes('/') || folder.includes('\\') || folder.includes('\0')) {
            return response.badRequest(res, 'Invalid folder path');
        }
        const nameCheck = validateSafeFilename(filename);
        if (!nameCheck.valid) return response.badRequest(res, `Invalid filename: ${nameCheck.error}`);

        if (minioConfig.enable) {
            // MinIO path — key stored in DB is "pdfs/<folder>/<filename>"
            const key = `pdfs/${folder}/${filename}`;
            const cacheKey = `file_auth:${key}`;

            const cached = await redisClient.get(cacheKey);
            if (!cached) {
                const pdf = await PdfDocumentRepository.findByFileUrl(key);
                if (!pdf) return response.notFound(res, 'File not found');
                await redisClient.set(cacheKey, '1', { EX: 3600 });
            }

            const url = await getPresignedUrl(key, FILE_URL_TTL_SECONDS);
            return response.success(res, { url });

        } else {
            // Disk path — nginx secure_link signing
            const requestedPath = `/uploads/${folder}/${filename}`;
            const cacheKey = `file_auth:${requestedPath}`;

            const cached = await redisClient.get(cacheKey);
            if (!cached) {
                const pdf = await PdfDocumentRepository.findByFileUrl(requestedPath);
                if (!pdf) return response.notFound(res, 'File not found');
                await redisClient.set(cacheKey, '1', { EX: 3600 });
            }

            const expiresAt = Math.floor(Date.now() / 1000) + FILE_URL_TTL_SECONDS;
            const url = generateNginxSignedUrl(requestedPath, expiresAt);
            return response.success(res, { url });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    searchPdfs,
    getAllPdfs,
    getPdfById,
    getAdminPdfById,
    uploadPdf,
    updatePdf,
    deletePdf,
    getCategories,
    getSignedFileUrl
};