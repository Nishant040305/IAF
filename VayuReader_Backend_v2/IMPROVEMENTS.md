# Backend Scalability Improvements Overview

This document records planned optimizations to enable the backend to handle 200,000+ peak users.

## 1. Search Optimization (Critical)
**Current State**: Uses Regex (`$regex`) on `content` fields.
**Problem**: Regex forces a full collection scan (O(N)). With large PDF content and thousands of concurrent searches, this will cause 100% CPU usage and database timeouts.
**Proposed Solution**: Switch to **MongoDB Text Search**.
*   **Action**: Add `{ title: 'text', content: 'text' }` index to `PdfDocument`, `Word`, and `Abbreviation` schemas.
*   **Action**: Update Controllers (`pdf.controller.js`, etc.) to use `{ $text: { $search: query } }`.
*   **Benefit**: Search becomes O(log N) (Index Lookup), virtually instant regardless of data size.

## 2. Unbounded Pagination (Safety)
**Current State**: Some controllers (e.g., `Dictionary`, `Abbreviation`) allow querying without a hard limit on document count.
**Problem**: A broad search could try to load 100,000 records into RAM, causing a "Heap Out of Memory" crash.
**Proposed Solution**: Enforce hard limits.
*   **Action**: Ensure every `find()` query has a `.limit(100)` or similar reasonable max.
