/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * pdfjs-dist v4.x only ships ES modules (.mjs) which cannot be loaded via
 * plain <script> tags on Android WebView's file:///android_asset/ scheme
 * (MIME-type enforcement blocks module scripts).
 *
 * We therefore download the last UMD build (v3.11.174) which ships proper
 * .js files that expose `window.pdfjsLib` when loaded via <script>.
 *
 * The npm pdfjs-dist@4.x in package.json is still available for any Node /
 * bundler-based usage; these downloaded assets are only for the WebView.
 */

const PDFJS_VERSION = '3.11.174';
const BASE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`;

const FILES = ['pdf.min.js', 'pdf.worker.min.js'];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        // Follow redirects (3xx)
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          return download(response.headers.location, dest).then(resolve, reject);
        }
        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          return reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      })
      .on('error', (err) => {
        file.close();
        fs.unlinkSync(dest);
        reject(err);
      });
  });
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const destDir = path.join(
    projectRoot,
    'android',
    'app',
    'src',
    'main',
    'assets',
    'pdfjs'
  );

  ensureDir(destDir);

  // Skip download if files already exist with non-zero size
  const allExist = FILES.every((f) => {
    const p = path.join(destDir, f);
    return fs.existsSync(p) && fs.statSync(p).size > 1000;
  });

  if (allExist) {
    console.log('[copy-pdfjs-assets] pdf.js assets already present, skipping download.');
    return;
  }

  console.log(`[copy-pdfjs-assets] Downloading pdf.js v${PDFJS_VERSION} UMD builds…`);

  for (const file of FILES) {
    const url = `${BASE_URL}/${file}`;
    const dest = path.join(destDir, file);
    console.log(`  ↓ ${file}`);
    await download(url, dest);
  }

  console.log('[copy-pdfjs-assets] Done. Assets written to', destDir);
}

main().catch((err) => {
  console.error('[copy-pdfjs-assets] FAILED:', err.message);
  process.exit(1);
});