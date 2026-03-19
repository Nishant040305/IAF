/**
 * File Type Validation Utilities
 *
 * @module utils/fileValidator
 */

const FileType = require('file-type');
const path = require('path');

const ALLOWED_TYPES = {
    pdf: ['application/pdf'],
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    pdfOrImage: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
};

/**
 * Detect file type from either a file path (string) or a Buffer.
 * @param {string|Buffer} source
 * @returns {Promise<{ext: string, mime: string}|undefined>}
 */
const detectFileType = async (source) => {
    if (Buffer.isBuffer(source)) {
        return FileType.fromBuffer(source);
    }
    return FileType.fromFile(source);
};

/**
 * Validates a file against allowed MIME types.
 * Accepts either a file path (disk storage) or a Buffer (memory storage).
 *
 * @param {string|Buffer} source - File path or Buffer
 * @param {string[]} allowedTypes
 * @returns {Promise<{valid: boolean, type: Object|null, error: string|null}>}
 */
const validateFileType = async (source, allowedTypes) => {
    try {
        const type = await detectFileType(source);

        if (!type) {
            return { valid: false, type: null, error: 'Unable to determine file type' };
        }

        if (!allowedTypes.includes(type.mime)) {
            return {
                valid: false,
                type,
                error: `File type ${type.mime} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
            };
        }

        return { valid: true, type, error: null };
    } catch (error) {
        return { valid: false, type: null, error: `File validation error: ${error.message}` };
    }
};

/**
 * Cross-validates file extension against detected magic bytes.
 * Catches spoofed files (e.g., .exe renamed to .pdf).
 * Accepts either a file path (disk storage) or a Buffer (memory storage).
 *
 * @param {string} originalName - Original filename
 * @param {string|Buffer} source - File path or Buffer
 * @returns {Promise<{valid: boolean, error: string|null, detectedType: Object|null}>}
 */
const validateExtensionMatchesContent = async (originalName, source) => {
    const ext = path.extname(originalName).toLowerCase().replace('.', '');
    const type = await detectFileType(source);

    if (!type) {
        return { valid: false, error: 'Unable to determine actual file type from content', detectedType: null };
    }

    const extensionMap = {
        pdf: ['pdf'],
        jpg: ['jpg', 'jpeg'],
        jpeg: ['jpg', 'jpeg'],
        png: ['png'],
        gif: ['gif'],
        webp: ['webp']
    };

    const allowedExts = extensionMap[ext];
    if (!allowedExts) {
        return { valid: false, error: `Unsupported file extension: .${ext}`, detectedType: type };
    }

    if (!allowedExts.includes(type.ext)) {
        return {
            valid: false,
            error: `File spoofing detected: Extension is .${ext} but actual content is ${type.mime} (.${type.ext})`,
            detectedType: type
        };
    }

    return { valid: true, error: null, detectedType: type };
};

/**
 * Validates that a filename is safe (no path traversal, no null bytes).
 *
 * @param {string} filename
 * @returns {{valid: boolean, error: string|null}}
 */
const validateSafeFilename = (filename) => {
    if (!filename || typeof filename !== 'string') {
        return { valid: false, error: 'Filename is required' };
    }
    if (filename.includes('\0')) {
        return { valid: false, error: 'Filename contains null bytes' };
    }
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return { valid: false, error: 'Path traversal detected in filename' };
    }
    if (filename.startsWith('.')) {
        return { valid: false, error: 'Hidden files are not allowed' };
    }
    return { valid: true, error: null };
};

const generateSafeFilename = (originalName, detectedType, uuid) => {
    const ext = detectedType ? `.${detectedType.ext}` : path.extname(originalName);
    return `${uuid}${ext}`;
};

const isPdf = async (source) => (await validateFileType(source, ALLOWED_TYPES.pdf)).valid;
const isImage = async (source) => (await validateFileType(source, ALLOWED_TYPES.image)).valid;

module.exports = {
    ALLOWED_TYPES,
    validateFileType,
    validateExtensionMatchesContent,
    validateSafeFilename,
    generateSafeFilename,
    isPdf,
    isImage
};