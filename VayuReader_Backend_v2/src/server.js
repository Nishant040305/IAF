/**
 * VayuReader Backend Server
 * 
 * Main entry point for the unified backend API.
 * 
 * @module server
 */

// Load environment configuration first (validates required vars)
const { server } = require('./config/environment');

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// Config
const { connectDB } = require('./config/database');
const { corsOptions } = require('./config/cors');

// Middleware
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { trimFields } = require('./middleware/validate');
const { requestTimeout } = require('./middleware/timeout');

// Routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const auditRoutes = require('./routes/audit.routes');
const pdfRoutes = require('./routes/pdf.routes');
const dictionaryRoutes = require('./routes/dictionary.routes');
const abbreviationRoutes = require('./routes/abbreviation.routes');

// =============================================================================
// APP INITIALIZATION
// =============================================================================

const app = express();

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', 1);

// Middleware Imports
const helmet = require('helmet');
const hpp = require('hpp');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Security Headers
app.use(helmet({
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    }
}));

// Prevent Parameter Pollution
app.use(hpp());

// Sanitize MongoDB inputs (NoSQL Injection prevention)
app.use(mongoSanitize());


// Response Compression
app.use(compression());

// CORS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Cookie parser (for JWT in HTTP-only cookies)
app.use(cookieParser());

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Trim whitespace from string fields
app.use(trimFields);

// Rate limiting on all API routes
app.use('/api', apiLimiter);

// Request timeout (30 seconds default)
app.use('/api', requestTimeout(30000));

// Static file serving for uploads
// Set Content-Disposition to prevent inline rendering of potentially dangerous files
app.use('/uploads', (req, res, next) => {
    res.setHeader('Content-Disposition', 'attachment');
    next();
}, express.static(path.join(__dirname, '..', 'uploads')));

// =============================================================================
// ROUTES
// =============================================================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        message: 'VayuReader Backend API is running',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/pdfs', pdfRoutes);
app.use('/api/dictionary', dictionaryRoutes);
app.use('/api/abbreviations', abbreviationRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'VayuReader Backend API',
        version: '2.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            admin: '/api/admin',
            audit: '/api/audit',
            pdfs: '/api/pdfs',
            dictionary: '/api/dictionary',
            abbreviations: '/api/abbreviations'
        }
    });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// =============================================================================
// SERVER STARTUP
// =============================================================================

const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Connect to Redis
        const { connectRedis } = require('./config/redis');
        await connectRedis();

        // Start HTTP server
        app.listen(server.port, () => {
            console.log('');
            console.log('╔════════════════════════════════════════════════════════╗');
            console.log('║         VayuReader Backend API v2.0.0                  ║');
            console.log('╠════════════════════════════════════════════════════════╣');
            console.log(`║  Server:     http://localhost:${server.port}                   ║`);
            console.log(`║  Health:     http://localhost:${server.port}/health             ║`);
            console.log(`║  Environment: ${server.nodeEnv.padEnd(12)}                      ║`);
            console.log('╠════════════════════════════════════════════════════════╣');
            console.log('║  Endpoints:                                            ║');
            console.log('║    /api/auth         - User authentication             ║');
            console.log('║    /api/admin        - Admin authentication            ║');
            console.log('║    /api/audit        - Audit logs                      ║');
            console.log('║    /api/pdfs         - PDF documents                   ║');
            console.log('║    /api/dictionary   - Dictionary words                ║');
            console.log('║    /api/abbreviations - Abbreviations                  ║');
            console.log('╚════════════════════════════════════════════════════════╝');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();

module.exports = app;
