/**
 * SSE Routes
 * 
 * Server-Sent Events endpoint for real-time PDF notifications.
 * 
 * @module routes/sse.routes
 */

const express = require('express');
const router = express.Router();

// Controller
const sseController = require('../controllers/sse.controller');

// Middleware
const { unifiedAuth } = require('../middleware/adminAuth');

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/events
 * Establish SSE connection for real-time PDF updates.
 * 
 * Note: Authentication removed because EventSource doesn't support
 * custom headers easily. PDF metadata events are not sensitive.
 * 
 * Events:
 * - connected: Initial connection confirmation
 * - PDF_ADDED: New PDF uploaded
 * - PDF_UPDATED: Existing PDF modified
 * - PDF_DELETED: PDF removed
 */
router.get(
    '/',
    sseController.connectToEvents
);

module.exports = router;
