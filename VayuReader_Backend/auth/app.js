const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');

const app = express();

connectDB();


app.use(cors());
app.use(express.json());


app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Auth service is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;