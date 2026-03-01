/**
 * PDF Sanitizer
 *
 * Rebuilds PDF content into a clean document and strips interactive/action keys.
 * Stored output should be a sanitized version of the uploaded file.
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

/**
 * Sanitize a PDF in place by rebuilding document pages and stripping active keys.
 *
 * @param {string} filePath - Absolute path to file.
 * @returns {Promise<{success: boolean, originalSize: number, sanitizedSize: number, strippedKeys: number}>}
 */
const sanitizePdfInPlace = async (filePath) => {
    const originalBytes = await fs.readFile(filePath);
    const originalSize = originalBytes.length;

    const sourceDoc = await PDFDocument.load(originalBytes, {
        ignoreEncryption: false,
        updateMetadata: false
    });

    if (sourceDoc.isEncrypted) {
        throw new Error('Encrypted PDFs are not allowed');
    }

    const sanitizedDoc = await PDFDocument.create();
    let strippedKeys = 0;

    const pageIndices = sourceDoc.getPageIndices();
    if (!pageIndices.length) {
        throw new Error('PDF has no pages');
    }

    const copiedPages = await sanitizedDoc.copyPages(sourceDoc, pageIndices);
    for (const page of copiedPages) {
        strippedKeys += deleteIfPresent(page.node, 'Annots') ? 1 : 0;
        strippedKeys += deleteIfPresent(page.node, 'AA') ? 1 : 0;
        strippedKeys += deleteIfPresent(page.node, 'AdditionalActions') ? 1 : 0;
        sanitizedDoc.addPage(page);
    }

    // Explicitly strip dangerous catalog-level interactive keys.
    const catalogKeysToStrip = [
        'OpenAction',
        'AA',
        'AcroForm',
        'Names',
        'JavaScript',
        'Perms',
        'Collection'
    ];
    for (const key of catalogKeysToStrip) {
        strippedKeys += deleteIfPresent(sanitizedDoc.catalog.dict, key) ? 1 : 0;
    }

    // Remove producer metadata from the original file chain and set trusted producer.
    sanitizedDoc.setProducer('VayuReader PDF Sanitizer');
    sanitizedDoc.setCreator('VayuReader Backend');

    const sanitizedBytes = await sanitizedDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
        updateFieldAppearances: false
    });

    await fs.writeFile(filePath, sanitizedBytes);

    return {
        success: true,
        originalSize,
        sanitizedSize: sanitizedBytes.length,
        strippedKeys
    };
};

module.exports = {
    sanitizePdfInPlace
};
