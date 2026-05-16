import { useNavigation } from '@react-navigation/native';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import SHA1 from 'crypto-js/sha1';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { PDF_BASE_URL } from '@/constants/config';
import { useAuth } from '@/contexts/AuthContext';
import { isPdfOcrSupported } from '@/lib/pdfOcr';
import { createSearchablePdf } from '@/lib/pdfEnhancer';
import { useOcrSearch } from '@/hooks/useOcrSearch';
import apiClient from '@/lib/apiClient';

const normalizePath = (value: string) => value.replace(/\\/g, '/');

const extractUploadParts = (value: string) => {
  const normalized = normalizePath(value);
  const trimmed = normalized.startsWith('/') ? normalized.slice(1) : normalized;
  if (!trimmed.startsWith('uploads/')) return null;
  const parts = trimmed.split('/');
  if (parts.length < 3) return null;
  return { folder: parts[1], filename: parts.slice(2).join('/') };
};

type PdfDocument = {
  _id: string;
  title: string;
  pdfUrl: string;
  thumbnail?: string;
  createdAt: string;
  viewCount: number;
  category: string;
};

const formatAccessedAt = (value: Date) => {
  const pad = (input: number) => String(input).padStart(2, '0');
  const day = pad(value.getDate());
  const month = pad(value.getMonth() + 1);
  const year = String(value.getFullYear())
  const hours = pad(value.getHours());
  const minutes = pad(value.getMinutes());

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const buildWatermarkItems = (width: number, height: number) => {
  const columns = 3;
  const rows = 6;
  const horizontalStep = width / columns;
  const verticalStep = height / rows;
  const items: { key: string; left: number; top: number }[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const rowOffset = row % 2 === 0 ? 0 : horizontalStep * 0.35;
      items.push({
        key: `${row}-${column}`,
        left: column * horizontalStep + rowOffset - 24,
        top: row * verticalStep + verticalStep * 0.16,
      });
    }
  }

  return items;
};

// ─── Search Bar Component (rendered inline, not as overlay) ──────────
type SearchBarProps = {
  query: string;
  onChangeQuery: (text: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  matchCount: number;
  activeIndex: number;
  scanning: boolean;
  scanProgress: string;
};

function PdfSearchBar({
  query,
  onChangeQuery,
  onSubmit,
  onClose,
  onNext,
  onPrev,
  matchCount,
  activeIndex,
  scanning,
  scanProgress,
}: SearchBarProps) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-focus when mounted
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const matchLabel =
    scanning
      ? scanProgress
      : matchCount > 0
        ? `${activeIndex + 1} / ${matchCount}`
        : query.length > 0
          ? 'No matches'
          : 'Type to search, Enter for full scan';

  return (
    <View style={searchStyles.container}>
      <View style={searchStyles.row}>
        <View style={searchStyles.inputWrapper}>
          <Text style={searchStyles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={searchStyles.input}
            placeholder="Search in PDF…"
            placeholderTextColor="#8888aa"
            value={query}
            onChangeText={onChangeQuery}
            onSubmitEditing={onSubmit}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            selectTextOnFocus
          />
          {scanning && (
            <ActivityIndicator
              size="small"
              color="#5B5FEF"
              style={searchStyles.spinner}
            />
          )}
        </View>

        {/* Navigation arrows */}
        <TouchableOpacity
          onPress={onPrev}
          disabled={matchCount === 0}
          style={[searchStyles.navBtn, matchCount === 0 && searchStyles.navBtnDisabled]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[searchStyles.navArrow, matchCount === 0 && searchStyles.navArrowDisabled]}>▲</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNext}
          disabled={matchCount === 0}
          style={[searchStyles.navBtn, matchCount === 0 && searchStyles.navBtnDisabled]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[searchStyles.navArrow, matchCount === 0 && searchStyles.navArrowDisabled]}>▼</Text>
        </TouchableOpacity>

        {/* Close button */}
        <TouchableOpacity
          onPress={onClose}
          style={searchStyles.closeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={searchStyles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {matchLabel ? (
        <Text style={searchStyles.matchLabel}>{matchLabel}</Text>
      ) : null}
    </View>
  );
}

const searchStyles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1730',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2a45',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262140',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 4,
  },
  spinner: {
    marginLeft: 6,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2d2a45',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  navArrow: {
    color: '#5B5FEF',
    fontSize: 14,
    fontWeight: '700',
  },
  navArrowDisabled: {
    color: '#555',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#3a1525',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  closeText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '700',
  },
  matchLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

// ─── Main PDF Reader ─────────────────────────────────────────────────
export default function PdfDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, initializing } = useAuth();
  const { width, height } = useWindowDimensions();
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessedAt, setAccessedAt] = useState(() => formatAccessedAt(new Date()));
  const navigation = useNavigation();

  // PDF.js viewer state (embedded via WebView)
  const webViewRef = useRef<WebView>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPageCount, setTotalPageCount] = useState(0);
  const [zoom, setZoom] = useState(1.25);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [, setLocalFilePath] = useState('');
  const localFilePathRef = useRef('');  // ref mirror to avoid stale closures

  // OCR enhancement state (non-blocking)
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceProgress, setEnhanceProgress] = useState('');

  // OCR search
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ocrSearch = useOcrSearch();
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use a ref for toggleSearch so the header button always has the latest reference
  const searchVisibleRef = useRef(false);

  const openSearch = useCallback(() => {
    console.log('[PdfDetails] Opening search. localFilePath:', localFilePathRef.current, 'ocrSupported:', isPdfOcrSupported());
    searchVisibleRef.current = true;
    setSearchVisible(true);
  }, []);

  const closeSearch = useCallback(() => {
    searchVisibleRef.current = false;
    setSearchVisible(false);
    ocrSearch.clearSearch();
    setSearchQuery('');
    Keyboard.dismiss();
  }, [ocrSearch]);

  // Set up header with search button — always show search icon (the OCR unsupported
  // message will appear when they try to use it on non-Android)
  useLayoutEffect(() => {
    if (doc?.title) {
      navigation.setOptions({
        title: doc.title,
        headerBackTitle: 'Back',
        headerTitleAlign: 'center',
      });
    }
  }, [doc, navigation]);

  // Separate effect for the search button so it doesn't go stale
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (searchVisibleRef.current) {
              closeSearch();
            } else {
              openSearch();
            }
          }}
          style={styles.headerSearchBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.headerSearchIcon}>🔍</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, openSearch, closeSearch]);

  useEffect(() => {
    if (id) {
      setAccessedAt(formatAccessedAt(new Date()));
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<any>(`/api/pdfs/${id}`, {
          baseURL: PDF_BASE_URL,
        });
        const data = response.data.data;
        setDoc(data);

        // Fetch signed url if available
        if (data.pdfUrl) {
          const parts = extractUploadParts(data.pdfUrl);
          if (parts) {
            try {
              const fileRes = await apiClient.get<any>(
                `/api/pdfs/file/${encodeURIComponent(parts.folder)}/${encodeURIComponent(parts.filename)}`,
                { baseURL: PDF_BASE_URL }
              );
              let url = fileRes.data?.data?.url;
              if (url) {
                const cleanBase = PDF_BASE_URL.endsWith('/') ? PDF_BASE_URL.slice(0, -1) : PDF_BASE_URL;
                if (url.startsWith('/')) {
                   url = `${cleanBase}${url}`;
                } else if (!url.startsWith('http')) {
                   url = `${cleanBase}/${url}`;
                }
                setSignedPdfUrl(url);
              }
            } catch (err) {
              console.warn('[PdfDetails] Failed to fetch signed URL:', err);
            }
          }
        }

      } catch (e: any) {
        setError(e.message || 'Failed to load PDF details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── Search Handlers ──────────────────────────────────────────────
  const handleSearchQueryChange = useCallback(
    (text: string) => {
      setSearchQuery(text);

      // Debounce: search current page quickly on each keystroke
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        const filePath = localFilePathRef.current;
        if (text.trim().length > 0 && filePath) {
          console.log('[PdfDetails] Debounced search for:', text, 'on page:', currentPage, 'file:', filePath);
          ocrSearch.searchCurrentPage(text, filePath, currentPage);
        } else {
          console.warn('[PdfDetails] Debounced search skipped: text=', text, 'filePath=', filePath);
          ocrSearch.clearSearch();
        }
      }, 400);
    },
    [currentPage, ocrSearch],
  );

  const handleSearchSubmit = useCallback(() => {
    const filePath = localFilePathRef.current;
    if (searchQuery.trim().length > 0 && filePath) {
      console.log('[PdfDetails] Full doc search for:', searchQuery, 'file:', filePath);
      // Full document search on submit
      ocrSearch.search(searchQuery, filePath);
    } else {
      console.warn('[PdfDetails] Cannot search: query:', searchQuery, 'localFilePath:', filePath);
    }
  }, [searchQuery, ocrSearch]);

  // ── OCR dimensions for the current page ──────────────────────────
  const cachedPage = ocrSearch.getCachedPage(currentPage);
  const ocrImageWidth = cachedPage?.imageWidth ?? 0;
  const ocrImageHeight = cachedPage?.imageHeight ?? 0;

  const pdfUrl = signedPdfUrl
    ? signedPdfUrl
    : doc?.pdfUrl
      ? (() => {
          const cleanBase = PDF_BASE_URL.endsWith('/') ? PDF_BASE_URL.slice(0, -1) : PDF_BASE_URL;
          let cleanPath = doc.pdfUrl.startsWith('/') ? doc.pdfUrl : `/${doc.pdfUrl}`;
          cleanPath = cleanPath.replace(/\\/g, '/');
          return `${cleanBase}${cleanPath}`;
        })()
      : '';

  const postToWeb = useCallback((payload: any) => {
    webViewRef.current?.postMessage(JSON.stringify(payload));
  }, []);

  const goToPage = useCallback((page: number) => {
    if (!totalPageCount) return;
    const clamped = Math.max(1, Math.min(totalPageCount, page));
    setCurrentPage(clamped);
    postToWeb({ type: 'SET_PAGE', page: clamped });
  }, [postToWeb, totalPageCount]);

  const setWebZoom = useCallback((nextZoom: number) => {
    const clamped = Math.max(0.75, Math.min(4, nextZoom));
    setZoom(clamped);
    postToWeb({ type: 'SET_ZOOM', zoom: clamped });
  }, [postToWeb]);

  const handleWebMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg?.type === 'DOC_INFO') {
        if (Number.isFinite(msg.pages) && msg.pages > 0) {
          setTotalPageCount(msg.pages);
          ocrSearch.setTotalPages(msg.pages);
        }
      } else if (msg?.type === 'RENDER_INFO') {
        if (Number.isFinite(msg.page)) setCurrentPage(msg.page);
        if (Number.isFinite(msg.canvasWidth) && Number.isFinite(msg.canvasHeight)) {
          setCanvasSize({ width: msg.canvasWidth, height: msg.canvasHeight });
        }
      } else if (msg?.type === 'ERROR') {
        setError(msg.message || 'PDF.js failed to load.');
      }
    } catch {
      // ignore
    }
  }, [ocrSearch]);

  const ocrAvailable = isPdfOcrSupported();

  // Download PDF to a stable cache path so:
  // - OCR can read it from local filesystem
  useEffect(() => {
    if (!signedPdfUrl && !doc?.pdfUrl) return;

    const getFullUrl = (base: string, p: any) => {
      if (!p) return '';
      if (typeof p !== 'string') return p;
      const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
      let cleanP = p.startsWith('/') ? p : `/${p}`;
      cleanP = cleanP.replace(/\\/g, '/');
      return `${cleanBase}${cleanP}`;
    };

    const computedPdfUrl = signedPdfUrl || (doc?.pdfUrl ? getFullUrl(PDF_BASE_URL, doc.pdfUrl) : '');
    if (!computedPdfUrl) return;

    const expectedCacheFile = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${SHA1(computedPdfUrl).toString()}.pdf`;
    console.log('[PdfDetails] Computed cache path:', expectedCacheFile, 'for URL:', computedPdfUrl);

    let cancelled = false;

    const ensureCached = async () => {
      try {
        const exists = await ReactNativeBlobUtil.fs.exists(expectedCacheFile);
        if (cancelled) return;

        if (!exists) {
          const task = ReactNativeBlobUtil.config({
            path: expectedCacheFile,
            fileCache: true,
            overwrite: true,
          }).fetch('GET', computedPdfUrl);

          task.progress({ interval: 250 }, (received: number, total: number) => {
            if (cancelled) return;
            if (Number.isFinite(total) && total > 0) {
              const pct = Math.floor((received / total) * 100);
              console.log('[PdfDetails] Download progress:', pct, '%');
            }
          });

          await task;
        }

        if (cancelled) return;
        // Set the cached original immediately so search can work
        localFilePathRef.current = expectedCacheFile;
        setLocalFilePath(expectedCacheFile);

        // Kick off OCR enhancement in the background (non-blocking)
        if (isPdfOcrSupported()) {
          const searchableFile = expectedCacheFile.replace(/\.pdf$/i, '_searchable.pdf');
          const searchableExists = await ReactNativeBlobUtil.fs.exists(searchableFile);

          if (searchableExists) {
            console.log('[PdfDetails] Found existing searchable PDF:', searchableFile);
            localFilePathRef.current = searchableFile;
            setLocalFilePath(searchableFile);
          } else {
            // Run in background — don't block the viewer
            setEnhancing(true);
            setEnhanceProgress('Starting…');
            createSearchablePdf(expectedCacheFile, (prog, tot) => {
              if (!cancelled) {
                setEnhanceProgress(`Page ${prog} of ${tot}`);
              }
            })
              .then((createdFile) => {
                if (!cancelled) {
                  console.log('[PdfDetails] Searchable PDF ready:', createdFile);
                  localFilePathRef.current = createdFile;
                  setLocalFilePath(createdFile);
                }
              })
              .catch((e) => {
                console.warn('[PdfDetails] Failed to create searchable PDF:', e);
              })
              .finally(() => {
                if (!cancelled) setEnhancing(false);
              });
          }
        }
      } catch (err: any) {
        console.warn('[PdfDetails] Failed to cache PDF:', err);
        setError(err?.message ?? 'Failed to cache PDF.');
      } finally {
        // no-op
      }
    };

    ensureCached();

    return () => {
      cancelled = true;
    };
  }, [signedPdfUrl, doc?.pdfUrl]);

  // ── Rendering ────────────────────────────────────────────────────
  if (loading || initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5B5FEF" />
      </View>
    );
  }

  if (error || !doc) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red' }}>{error || 'PDF not found'}</Text>
      </View>
    );
  }

  const watermarkLabel = `${user?.phone_number ?? 'Unknown user'} ${accessedAt}`;
  const watermarkItems = buildWatermarkItems(width, height);

  const pdfJsHtml = `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
    <style>
      html, body { margin:0; padding:0; background:#0b0a14; height:100%; }
      #wrap { position:relative; width:100%; height:100%; overflow:auto; -webkit-overflow-scrolling: touch; }
      #page { position:relative; margin:0 auto; padding:12px 0; }
      canvas { display:block; background:#fff; margin:0 auto; }
    </style>
    <script src="pdfjs/pdf.min.js"><\/script>
    <script>
      (function () {
        var send = function(obj) { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(obj)); };
        var state = { url: null, pdf: null, page: 1, pages: 0, zoom: ${zoom}, rendering: false };

        if (!window.pdfjsLib) {
          send({ type: 'ERROR', message: 'pdf.js not available. Did the app assets copy step run?' });
          return;
        }

        var pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs/pdf.worker.min.js';

        async function load(url) {
          state.url = url;
          state.pdf = await pdfjsLib.getDocument({ url: url }).promise;
          state.pages = state.pdf.numPages || 0;
          send({ type: 'DOC_INFO', pages: state.pages });
          await render(state.page);
        }

        async function render(pageNum) {
          if (!state.pdf || state.rendering) return;
          state.rendering = true;
          try {
            var page = await state.pdf.getPage(pageNum);
            var viewport = page.getViewport({ scale: state.zoom });
            var canvas = document.getElementById('canvas');
            var ctx = canvas.getContext('2d', { alpha: false });
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            var pageDiv = document.getElementById('page');
            pageDiv.style.width = canvas.width + 'px';
            pageDiv.style.height = canvas.height + 'px';
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            send({ type: 'RENDER_INFO', page: pageNum, zoom: state.zoom, canvasWidth: canvas.width, canvasHeight: canvas.height });
          } catch (e) {
            send({ type: 'ERROR', message: String(e && e.message ? e.message : e) });
          } finally {
            state.rendering = false;
          }
        }

        function handleMsg(ev) {
          try {
            var msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data);
            if (msg.type === 'LOAD' && msg.url) load(msg.url);
            if (msg.type === 'SET_PAGE') { state.page = msg.page; render(state.page); }
            if (msg.type === 'SET_ZOOM') { state.zoom = msg.zoom; render(state.page); }
          } catch (e) {}
        }

        document.addEventListener('message', handleMsg);
        window.addEventListener('message', handleMsg);
      })();
    <\/script>
  </head>
  <body>
    <div id="wrap">
      <div id="page">
        <canvas id="canvas"></canvas>
      </div>
    </div>
  </body>
</html>
`;


  return (
    <>
      <Stack>
        <Stack.Screen
          options={{
            title: 'PDF Viewer',
            headerBackTitle: 'Back',
            headerTitleAlign: 'center',
          }}
        />
      </Stack>
      <View style={styles.container}>
        {/* Search bar - rendered as part of the layout flow, above the PDF */}
        {searchVisible && (
          ocrAvailable ? (
            <PdfSearchBar
              query={searchQuery}
              onChangeQuery={handleSearchQueryChange}
              onSubmit={handleSearchSubmit}
              onClose={closeSearch}
              onNext={ocrSearch.nextMatch}
              onPrev={ocrSearch.prevMatch}
              matchCount={ocrSearch.matches.length}
              activeIndex={ocrSearch.activeMatchIndex}
              scanning={ocrSearch.scanning}
              scanProgress={ocrSearch.scanProgress}
            />
          ) : (
            <View style={styles.ocrUnsupportedBanner}>
              <Text style={styles.ocrUnsupportedText}>
                OCR search requires an Android device with the native module installed.
              </Text>
              <TouchableOpacity onPress={closeSearch} style={{ marginTop: 8 }}>
                <Text style={{ color: '#5B5FEF', fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {/* PDF Viewer */}
        <View style={styles.pdfContainer}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: pdfJsHtml, baseUrl: 'file:///android_asset/' }}
            onMessage={handleWebMessage}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            allowFileAccess
            allowUniversalAccessFromFileURLs
            style={styles.webview}
            onLoadEnd={() => {
              if (pdfUrl) postToWeb({ type: 'LOAD', url: pdfUrl });
              if (zoom) postToWeb({ type: 'SET_ZOOM', zoom });
              if (currentPage) postToWeb({ type: 'SET_PAGE', page: currentPage });
            }}
          />

          {/* OCR Highlight Overlay — positioned over the PDF.js canvas */}
          {searchVisible && ocrSearch.matches.length > 0 && ocrImageWidth > 0 && canvasSize.width > 0 ? (
            <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
              {ocrSearch.matches
                .filter(m => m.page === currentPage)
                .map((match, idx) => {
                  const scaleX = canvasSize.width / ocrImageWidth;
                  const scaleY = canvasSize.height && ocrImageHeight ? canvasSize.height / ocrImageHeight : scaleX;
                  const isActive =
                    ocrSearch.activeMatchIndex >= 0 &&
                    ocrSearch.matches[ocrSearch.activeMatchIndex]?.page === currentPage &&
                    ocrSearch.matches[ocrSearch.activeMatchIndex]?.wordIndex === match.wordIndex;
                  return (
                    <View
                      key={`hl-${match.page}-${match.wordIndex}-${idx}`}
                      style={[
                        styles.hlBox,
                        {
                          left: match.box.x * scaleX,
                          top: match.box.y * scaleY,
                          width: match.box.width * scaleX,
                          height: match.box.height * scaleY,
                          backgroundColor: isActive ? 'rgba(251, 191, 36, 0.45)' : 'rgba(91, 95, 239, 0.3)',
                          borderColor: isActive ? 'rgba(251, 191, 36, 0.8)' : 'rgba(91, 95, 239, 0.6)',
                          justifyContent: 'center',
                        },
                      ]}
                    >
                      <Text
                        selectable={true}
                        style={{
                          color: 'transparent',
                          fontSize: Math.max(1, match.box.height * scaleY * 0.8),
                        }}
                      >
                        {match.box.text}
                      </Text>
                    </View>
                  );
                })}
            </View>
          ) : null}
        </View>

        {/* Watermark layer */}
        <View pointerEvents="none" style={styles.watermarkLayer}>
          {watermarkItems.map(item => (
            <Text
              key={item.key}
              style={[
                styles.watermarkText,
                {
                  left: item.left,
                  top: item.top,
                },
              ]}
            >
              {watermarkLabel}
            </Text>
          ))}
        </View>

        {/* Page / zoom controls */}
        {totalPageCount > 0 ? (
          <View style={styles.controls}>
            <TouchableOpacity onPress={() => goToPage(currentPage - 1)} style={styles.ctrlBtn} disabled={currentPage <= 1}>
              <Text style={styles.ctrlText}>Prev</Text>
            </TouchableOpacity>
            <Text style={styles.ctrlLabel}>
              {currentPage} / {totalPageCount}
            </Text>
            <TouchableOpacity onPress={() => goToPage(currentPage + 1)} style={styles.ctrlBtn} disabled={currentPage >= totalPageCount}>
              <Text style={styles.ctrlText}>Next</Text>
            </TouchableOpacity>
            <View style={styles.ctrlSep} />
            <TouchableOpacity onPress={() => setWebZoom(zoom - 0.25)} style={styles.ctrlBtn}>
              <Text style={styles.ctrlText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.ctrlLabel}>{Math.round(zoom * 100)}%</Text>
            <TouchableOpacity onPress={() => setWebZoom(zoom + 0.25)} style={styles.ctrlBtn}>
              <Text style={styles.ctrlText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Non-blocking OCR enhancement banner */}
        {enhancing && (
          <View style={styles.enhanceBanner}>
            <ActivityIndicator size="small" color="#5B5FEF" />
            <Text style={styles.enhanceBannerText}>
              Adding searchable text layer… {enhanceProgress}
            </Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pdfContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0b0a14',
  },
  hlBox: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 2,
  },
  controls: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 23, 48, 0.88)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  ctrlBtn: {
    backgroundColor: '#262140',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 4,
  },
  ctrlText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  ctrlLabel: {
    color: '#d1d5db',
    fontWeight: '700',
    fontSize: 12,
    marginHorizontal: 6,
  },
  ctrlSep: {
    width: 1,
    height: 18,
    backgroundColor: '#2d2a45',
    marginHorizontal: 6,
  },
  watermarkLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  watermarkText: {
    position: 'absolute',
    width: 260,
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
    opacity: 0.26,
    transform: [{ rotate: '-24deg' }],
  },
  headerSearchBtn: {
    marginRight: 8,
    padding: 6,
    backgroundColor: '#262140',
    borderRadius: 8,
  },
  headerSearchIcon: {
    fontSize: 18,
  },
  ocrUnsupportedBanner: {
    backgroundColor: '#1a1730',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2a45',
    padding: 16,
    alignItems: 'center',
  },
  ocrUnsupportedText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  enhanceBanner: {
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 23, 48, 0.92)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  enhanceBannerText: {
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: '600',
  },
  pageIndicator: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(26, 23, 48, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pageIndicatorText: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '600',
  },
});
