import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { ocrPdfPage, isPdfOcrSupported } from './pdfOcr';

/**
 * Takes a downloaded (scanned) PDF file path, runs OCR on every page,
 * and produces a new PDF that contains an invisible text layer on top of
 * each page image.  The text is positioned so that it aligns with the
 * visible words, enabling native Ctrl-F / text-selection in any viewer.
 *
 * The enhanced file is written next to the original with a `_searchable`
 * suffix and returned.  If a `_searchable` variant already exists, the
 * path is returned immediately without re-processing.
 *
 * @param originalPdfPath  Absolute local path to the raw PDF.
 * @param onProgress       Optional callback `(currentPage, totalPages)`.
 * @returns                Absolute path to the searchable PDF.
 */
export async function createSearchablePdf(
  originalPdfPath: string,
  onProgress?: (progress: number, total: number) => void,
): Promise<string> {
  const searchablePath = originalPdfPath.replace(/\.pdf$/i, '_searchable.pdf');

  // Already built?
  const exists = await ReactNativeBlobUtil.fs.exists(searchablePath);
  if (exists) return searchablePath;

  if (!isPdfOcrSupported()) {
    throw new Error('OCR is not available on this device.');
  }

  // ── 1. Load the original PDF ──────────────────────────────────────
  const pdfBase64 = await ReactNativeBlobUtil.fs.readFile(originalPdfPath, 'base64');
  const pdfDoc = await PDFDocument.load(pdfBase64);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  // ── 2. OCR each page and embed invisible text ─────────────────────
  for (let i = 0; i < pages.length; i++) {
    const pageNumber = i + 1;
    const page = pages[i];
    const { width: pdfW, height: pdfH } = page.getSize();

    let ocrResult;
    try {
      ocrResult = await ocrPdfPage(originalPdfPath, pageNumber, 4);
    } catch (err) {
      console.warn(`[pdfEnhancer] OCR failed on page ${pageNumber}:`, err);
      onProgress?.(pageNumber, pages.length);
      continue;
    }

    if (!ocrResult.words.length || !ocrResult.imageWidth || !ocrResult.imageHeight) {
      onProgress?.(pageNumber, pages.length);
      continue;
    }

    const scaleX = pdfW / ocrResult.imageWidth;
    const scaleY = pdfH / ocrResult.imageHeight;

    for (const word of ocrResult.words) {
      const text = word.text;
      if (!text || !text.trim()) continue;

      // OCR coords are image-space, top-left origin.
      // PDF coords are bottom-left origin.
      const x = word.x * scaleX;
      const y = pdfH - (word.y + word.height) * scaleY; // baseline ≈ bottom of box

      // Target font-size so the rendered height matches the bounding box.
      const targetHeight = word.height * scaleY;
      const fontSize = Math.max(1, targetHeight);

      // Draw the invisible text at the computed position.
      // The text is fully transparent (opacity: 0) so it won't be visible,
      // but PDF viewers will index it for search and allow text selection.
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
        opacity: 0,
      });
    }

    onProgress?.(pageNumber, pages.length);

    // Yield to the JS thread every page to keep the UI responsive.
    await new Promise(r => setTimeout(r, 30));
  }

  // ── 3. Write the enhanced PDF to disk ─────────────────────────────
  const newBase64 = await pdfDoc.saveAsBase64();
  await ReactNativeBlobUtil.fs.writeFile(searchablePath, newBase64, 'base64');

  console.log('[pdfEnhancer] Searchable PDF written to:', searchablePath);
  return searchablePath;
}
