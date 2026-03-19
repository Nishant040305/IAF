/**
 * PDF Sanitizer
 *
 * Rebuilds PDF content into a clean document and strips interactive/action keys.
 *
 * @module utils/pdfSanitizer
 */

const fs = require('fs').promises;
const { PDFDocument, PDFName } = require('pdf-lib');

const deleteIfPresent = (node, key) => {
    if (!node || typeof node.delete !== 'function') return false;
    const pdfKey = PDFName.of(key);
    if (typeof node.has === 'function' && !node.has(pdfKey)) return false;
    node.delete(pdfKey);
    return true;
};

const CATALOG_KEYS_TO_STRIP = [
    'OpenAction',
    'AA',
    'AcroForm',
    'Names',
    'JavaScript',
    'Perms',
    'Collection'
];

/**
 * Core sanitization logic — operates purely on bytes.
 * Accepts a Buffer or Uint8Array, returns a sanitized Buffer.
 *
 * @param {Buffer|Uint8Array} inputBytes
 * @returns {Promise<Buffer>}
 */
const sanitizePdfBytes = async (inputBytes) => {
    const sourceDoc = await PDFDocument.load(inputBytes, {
        ignoreEncryption: false,
        updateMetadata: false
    });

    if (sourceDoc.isEncrypted) {
        throw new Error('Encrypted PDFs are not allowed');
    }

    const pageIndices = sourceDoc.getPageIndices();
    if (!pageIndices.length) {
        throw new Error('PDF has no pages');
    }

    const sanitizedDoc = await PDFDocument.create();

    const copiedPages = await sanitizedDoc.copyPages(sourceDoc, pageIndices);
    for (const page of copiedPages) {
        deleteIfPresent(page.node, 'Annots');
        deleteIfPresent(page.node, 'AA');
        deleteIfPresent(page.node, 'AdditionalActions');
        sanitizedDoc.addPage(page);
    }

    for (const key of CATALOG_KEYS_TO_STRIP) {
        deleteIfPresent(sanitizedDoc.catalog.dict, key);
    }

    sanitizedDoc.setProducer('VayuReader PDF Sanitizer');
    sanitizedDoc.setCreator('VayuReader Backend');

    const sanitizedBytes = await sanitizedDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
        updateFieldAppearances: false
    });

    return Buffer.from(sanitizedBytes);
};

/**
 * Sanitize a PDF buffer (MinIO / memory storage path).
 * Accepts a Buffer, returns a sanitized Buffer.
 *
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
const sanitizePdfBuffer = async (buffer) => {
    return sanitizePdfBytes(buffer);
};

/**
 * Sanitize a PDF in place (disk storage path).
 * Reads from filePath, writes sanitized result back to same path.
 *
 * @param {string} filePath - Absolute path to file.
 * @returns {Promise<void>}
 */
const sanitizePdfInPlace = async (filePath) => {
    const inputBytes = await fs.readFile(filePath);
    const sanitizedBytes = await sanitizePdfBytes(inputBytes);
    await fs.writeFile(filePath, sanitizedBytes);
};

module.exports = {
    sanitizePdfBuffer,
    sanitizePdfInPlace
};