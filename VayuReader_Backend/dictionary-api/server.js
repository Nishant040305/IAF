const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/database');
const dictionaryRoutes = require('./routes/dictionary');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true }));

app.use('/api/dictionary', dictionaryRoutes);


app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Dictionary API is running' });
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});


app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
