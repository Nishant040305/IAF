import { NativeModules, Platform } from 'react-native';

export type OcrWordBox = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OcrPageResult = {
  page: number;
  imageWidth: number;
  imageHeight: number;
  words: OcrWordBox[];
};

type PdfOcrNativeModule = {
  ocrPage: (pdfFilePath: string, pageNumber: number, scale: number) => Promise<OcrPageResult>;
};

const NativePdfOcr = NativeModules.PdfOcr as PdfOcrNativeModule | undefined;

export function isPdfOcrSupported() {
  return Platform.OS === 'android' && !!NativePdfOcr?.ocrPage;
}

export async function ocrPdfPage(pdfFilePath: string, pageNumber: number, scale = 4): Promise<OcrPageResult> {
  if (!NativePdfOcr?.ocrPage) {
    throw new Error('PDF OCR is not available on this device build.');
  }
  let res = await NativePdfOcr.ocrPage(pdfFilePath.toString(), pageNumber, scale);
  console.log("res", JSON.stringify(res))
  return res
}

/**
 * Scan multiple pages sequentially.
 * Returns an array of results (or null for pages that failed).
 * Calls `onProgress` after each page completes so the caller can update UI.
 */
export async function ocrPdfPages(
  pdfFilePath: string,
  pages: number[],
  scale = 4,
  onProgress?: (done: number, total: number, result: OcrPageResult | null) => void,
): Promise<(OcrPageResult | null)[]> {
  const results: (OcrPageResult | null)[] = [];
  for (let i = 0; i < pages.length; i++) {
    try {
      const result = await ocrPdfPage(pdfFilePath, pages[i], scale);
      console.log("page Result", result.words)
      results.push(result);
      await new Promise(r => setTimeout(r, 500));
      onProgress?.(i + 1, pages.length, result);
    } catch (err) {
      console.warn(`[pdfOcr] Failed to OCR page ${pages[i]}:`, err);
      results.push(null);
      onProgress?.(i + 1, pages.length, null);
    }
  }
  return results;
}
