const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path"); 
const cors = require("cors");

const adminAuthRoutes = require("../../VayuReader_Backend/admin_auth/adminAuthRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const dictionaryRoutes = require('./routes/dictionaryRoutes');

dotenv.config();
const app = express();


// CORS configuration
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
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api/auth", adminAuthRoutes);
app.use("/api/pdf", pdfRoutes); 
app.use('/api/abbreviation', require('./routes/abbreviationRoutes'));
app.use('/api/dictionary', dictionaryRoutes);


mongoose
.connect(process.env.MONGODB_URI)
.then(() => {
console.log("MongoDB connected");
app.listen(process.env.PORT || 5000, () =>
console.log(`Server running on port ${process.env.PORT}`)
);
})
