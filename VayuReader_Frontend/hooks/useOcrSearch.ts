import { OcrPageResult, ocrPdfPage, OcrWordBox } from '@/lib/pdfOcr';
import { useCallback, useRef, useState } from 'react';

export type OcrMatch = {
  /** 1-based page number */
  page: number;
  /** Index of the word within the page's words array */
  wordIndex: number;
  /** The matched word box */
  box: OcrWordBox;
};

export type OcrSearchState = {
  /** Whether OCR scanning is currently in progress */
  scanning: boolean;
  /** Progress message during scanning */
  scanProgress: string;
  /** All matches for the current query */
  matches: OcrMatch[];
  /** Index of the currently focused match (0-based), -1 if none */
  activeMatchIndex: number;
  /** The query that produced the current matches */
  activeQuery: string;
  /** OCR results cache keyed by page number */
  ocrCache: Map<number, OcrPageResult>;
  /** Total page count of the PDF */
  totalPages: number;
};

export function useOcrSearch() {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [matches, setMatches] = useState<OcrMatch[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const [activeQuery, setActiveQuery] = useState('');
  const scale = 4;
  // Cache OCR results so we don't re-scan pages
  const ocrCacheRef = useRef<Map<number, OcrPageResult>>(new Map());
  const totalPagesRef = useRef(0);
  const cancelRef = useRef(false);

  const setTotalPages = useCallback((count: number) => {
    totalPagesRef.current = count;
  }, []);

  /**
   * Run a text search across all pages using OCR.
   * Pages are scanned lazily and cached for subsequent searches.
   */
  const search = useCallback(async (query: string, localFilePath: string) => {
    const q = query.trim().toLowerCase();
    console.log('[useOcrSearch] search() called. query:', q, 'filePath:', localFilePath, 'totalPages:', totalPagesRef.current);
    if (!q) {
      setMatches([]);
      setActiveMatchIndex(-1);
      setActiveQuery('');
      return;
    }

    const total = totalPagesRef.current;
    if (total <= 0 || !localFilePath) {
      console.warn('[useOcrSearch] Cannot search: total=', total, 'filePath=', localFilePath);
      return;
    }

    cancelRef.current = false;
    setScanning(true);
    setActiveQuery(q);

    const allMatches: OcrMatch[] = [];

    try {
      for (let page = 1; page <= total; page++) {
        if (cancelRef.current) break;

        setScanProgress(`Scanning page ${page} of ${total}…`);

        // Use cached result or OCR the page
        let pageResult = ocrCacheRef.current.get(page);
        if (!pageResult) {
          try {
            console.log(`[useOcrSearch] OCR scanning page ${page}...`);
            pageResult = await ocrPdfPage(localFilePath, page, scale);
            console.log(`[useOcrSearch] Page ${page} OCR complete. words: ${pageResult.words.length}, imgSize: ${pageResult.imageWidth}x${pageResult.imageHeight}`);
            ocrCacheRef.current.set(page, pageResult);
          } catch (err) {
            console.warn(`[useOcrSearch] Failed to scan page ${page}:`, err);
            continue;
          }
        }

        // Search within this page's words
        for (let i = 0; i < pageResult.words.length; i++) {
          const word = pageResult.words[i];
          if (word.text.toLowerCase().includes(q)) {
            allMatches.push({ page, wordIndex: i, box: word });
          }
        }
      }

      if (!cancelRef.current) {
        console.log(`[useOcrSearch] Full search complete. Total matches: ${allMatches.length}`);
        setMatches(allMatches);
        setActiveMatchIndex(allMatches.length > 0 ? 0 : -1);
      }
    } finally {
      setScanning(false);
      setScanProgress('');
    }
  }, []);

  /**
   * Search only the currently visible page (fast, for incremental search).
   * Falls back to cached OCR if available, otherwise scans just that page.
   */
  const searchCurrentPage = useCallback(async (query: string, localFilePath: string, pageNumber: number) => {
    const q = query.trim().toLowerCase();
    console.log('[useOcrSearch] searchCurrentPage() called. query:', q, 'page:', pageNumber, 'filePath:', localFilePath);
    if (!q || !localFilePath || pageNumber < 1) {
      console.warn('[useOcrSearch] searchCurrentPage skipped: q=', q, 'path=', localFilePath, 'page=', pageNumber);
      setMatches([]);
      setActiveMatchIndex(-1);
      setActiveQuery('');
      return;
    }

    setActiveQuery(q);

    let pageResult = ocrCacheRef.current.get(pageNumber);
    if (!pageResult) {
      setScanning(true);
      setScanProgress(`Scanning page ${pageNumber}…`);
      try {
        console.log(`[useOcrSearch] OCR scanning page ${pageNumber} at path: ${localFilePath}`);
        pageResult = await ocrPdfPage(localFilePath, pageNumber, scale);
        console.log(`[useOcrSearch] Page ${pageNumber} OCR result: ${pageResult.words.length} words, ${pageResult.imageWidth}x${pageResult.imageHeight}`);
        ocrCacheRef.current.set(pageNumber, pageResult);
      } catch (err) {
        console.error(`[useOcrSearch] FAILED to OCR page ${pageNumber}:`, err);
        setScanning(false);
        setScanProgress('');
        return;
      }
      setScanning(false);
      setScanProgress('');
    } else {
      console.log(`[useOcrSearch] Using cached OCR for page ${pageNumber}: ${pageResult.words.length} words`);
    }

    const pageMatches: OcrMatch[] = [];
    for (let i = 0; i < pageResult.words.length; i++) {
      const word = pageResult.words[i];
      if (word.text.toLowerCase().includes(q)) {
        pageMatches.push({ page: pageNumber, wordIndex: i, box: word });
      }
    }

    console.log(`[useOcrSearch] Page ${pageNumber} search complete. Matches: ${pageMatches.length}`);
    setMatches(pageMatches);
    setActiveMatchIndex(pageMatches.length > 0 ? 0 : -1);
  }, []);

  const nextMatch = useCallback(() => {
    setActiveMatchIndex(prev => {
      if (matches.length === 0) return -1;
      return (prev + 1) % matches.length;
    });
  }, [matches]);

  const prevMatch = useCallback(() => {
    setActiveMatchIndex(prev => {
      if (matches.length === 0) return -1;
      return (prev - 1 + matches.length) % matches.length;
    });
  }, [matches]);

  const cancelSearch = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const clearSearch = useCallback(() => {
    cancelRef.current = true;
    setMatches([]);
    setActiveMatchIndex(-1);
    setActiveQuery('');
  }, []);

  /**
   * Get OCR matches for a specific page from the current result set.
   */
  const getMatchesForPage = useCallback((pageNumber: number) => {
    return matches.filter(m => m.page === pageNumber);
  }, [matches]);

  /**
   * Get cached OCR result for a specific page.
   */
  const getCachedPage = useCallback((pageNumber: number) => {
    return ocrCacheRef.current.get(pageNumber) ?? null;
  }, []);

  return {
    scanning,
    scanProgress,
    matches,
    activeMatchIndex,
    activeQuery,
    setTotalPages,
    search,
    searchCurrentPage,
    nextMatch,
    prevMatch,
    cancelSearch,
    clearSearch,
    getMatchesForPage,
    getCachedPage,
  };
}
