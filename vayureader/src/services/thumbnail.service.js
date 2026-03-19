/**
 * Thumbnail Service
 *
 * Generates a JPEG thumbnail from page 1 of a PDF.
 * Accepts either a file path (disk mode) or a Buffer (MinIO/memory mode).
 *
 * @module services/thumbnail.service
 */

const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const { execFile } = require('child_process');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');

const execFileAsync = promisify(execFile);

const THUMBNAIL_FORMAT = 'jpeg';
const THUMBNAIL_SCALE = 512;

/**
 * Core thumbnail generation — always works with file paths.
 * Writes output to outputDir, returns { thumbnailPath, thumbnailFilename }.
 *
 * @param {string} pdfPath   - Absolute path to the PDF file
 * @param {string} outputDir - Directory to write thumbnail into
 */
const generateThumbnailFromPath = async (pdfPath, outputDir) => {
    const thumbnailId = uuidv4();
    const outputPrefix = path.join(outputDir, thumbnailId);
    const ext = THUMBNAIL_FORMAT === 'jpeg' ? 'jpg' : THUMBNAIL_FORMAT;
    const thumbnailPath = `${outputPrefix}.${ext}`;

    try {
        await fs.mkdir(outputDir, { recursive: true });

        await execFileAsync('pdftoppm', [
            `-${THUMBNAIL_FORMAT}`,
            '-f', '1',
            '-singlefile',
            '-scale-to', String(THUMBNAIL_SCALE),
            pdfPath,
            outputPrefix
        ], { timeout: 15000 });

        await fs.access(thumbnailPath);

        return { thumbnailPath, thumbnailFilename: `${thumbnailId}.${ext}` };
    } catch (error) {
        await fs.unlink(thumbnailPath).catch(() => { });

        if (error.killed) {
            throw new Error('Thumbnail generation timed out (PDF may be too complex)');
        }
        throw new Error(`Failed to generate thumbnail: ${error.message}`);
    }
};

/**
 * Generate thumbnail from a PDF Buffer (MinIO / memory storage path).
 * Writes buffer to a temp file, generates thumbnail, returns thumbnail as Buffer.
 * Cleans up all temp files regardless of success or failure.
 *
 * @param {Buffer} pdfBuffer
 * @returns {Promise<Buffer>} JPEG thumbnail buffer
 */
const generateThumbnailFromBuffer = async (pdfBuffer) => {
    const tmpDir = os.tmpdir();
    const tmpPdfPath = path.join(tmpDir, `${uuidv4()}.pdf`);
    const tmpThumbDir = path.join(tmpDir, uuidv4());

    try {
        // Write buffer to temp file so pdftoppm can read it
        await fs.writeFile(tmpPdfPath, pdfBuffer);

        const { thumbnailPath } = await generateThumbnailFromPath(tmpPdfPath, tmpThumbDir);

        // Read result back as buffer
        const thumbnailBuffer = await fs.readFile(thumbnailPath);
        return thumbnailBuffer;
    } finally {
        // Always clean up temp files
        await fs.unlink(tmpPdfPath).catch(() => { });
        await fs.rm(tmpThumbDir, { recursive: true, force: true }).catch(() => { });
    }
};

/**
 * Public API — accepts either a Buffer or a file path.
 *
 * Buffer mode  (MinIO):  generateThumbnail(buffer)
 *   → returns Buffer
 *
 * Path mode    (disk):   generateThumbnail(pdfPath, outputDir)
 *   → returns { thumbnailPath, thumbnailFilename }
 */
const generateThumbnail = async (pdfPathOrBuffer, outputDir) => {
    if (Buffer.isBuffer(pdfPathOrBuffer)) {
        return generateThumbnailFromBuffer(pdfPathOrBuffer);
    }
    return generateThumbnailFromPath(pdfPathOrBuffer, outputDir);
};

module.exports = { generateThumbnail };