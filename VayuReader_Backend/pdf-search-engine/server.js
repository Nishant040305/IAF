require("dotenv").config();
const path    = require('path');
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const pdfRoutes = require("./routes/pdfRoutes");

const app = express();
const PORT = process.env.PORT || 3005;

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
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));


app.use("/api/pdfs", pdfRoutes);
app.use("/uploads", express.static(path.join(__dirname, 'uploads')));


app.get("/", (req, res) => {
  res.json({ message: "PDF Search Engine API" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
