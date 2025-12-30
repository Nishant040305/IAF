const express = require('express');
const cors = require('cors');
const path = require('path');
// Load .env from admin_auth folder first, then fallback to parent .env
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const adminAuthRoutes = require('./adminAuthRoutes');
const auditRoutes = require('./routes/auditRoutes');
const subAdminRoutes = require('./routes/subAdminRoutes');

const app = express();
const PORT = process.env.ADMIN_AUTH_PORT || 3012;

// Middleware - CORS configuration
// Allow all origins in development (you can restrict this in production)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all localhost origins for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // In production, you can add specific allowed origins here
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (before routes)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Admin Auth Service is running',
    port: PORT
  });
});

// Routes
app.use('/api/auth', adminAuthRoutes);
console.log('✓ Admin auth routes mounted at /api/auth');

app.use('/api/audit', auditRoutes);
console.log('✓ Audit routes mounted at /api/audit');

app.use('/api/sub-admins', subAdminRoutes);
console.log('✓ Sub-admin routes mounted at /api/sub-admins');

// 404 handler for undefined routes (must be last, no path specified)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Admin Auth Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Login endpoint: http://localhost:${PORT}/api/auth/login`);
});

module.exports = app;

