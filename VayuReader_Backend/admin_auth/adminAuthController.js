const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('mongoose');
// Load .env from admin_auth folder first, then fallback to parent .env
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ADMIN_NAME = process.env.ADMIN_NAME || 'Himanshu Bhatt';
const ADMIN_CONTACT = process.env.ADMIN_CONTACT || '89200 67341';
const JWT_SECRET = process.env.JWT_SECRET || 'admin-secret-key';
const JWT_EXPIRY_DAYS = process.env.JWT_EXPIRY_DAYS || '1';
const MONGODB_URI = process.env.MONGODB_URI;

// Connect to MongoDB for sub-admin lookup
let dbConnected = false;
const connectDB = async () => {
  if (dbConnected && mongoose.connection.readyState === 1) {
    return;
  }
  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI);
      dbConnected = true;
    } catch (error) {
      console.error('Failed to connect to MongoDB for admin auth:', error.message);
    }
  }
};

const SubAdmin = require('./models/SubAdmin');

// Login admin with name and contact (supports both super admin and sub-admins)
const loginAdmin = async (req, res) => {
  try {
    const { name, contact } = req.body;

    // Validate input
    if (!name || !contact) {
      return res.status(400).json({
        success: false,
        message: 'Name and contact are required'
      });
    }

    // Normalize contact (remove spaces for comparison)
    const normalizedContact = contact.replace(/\s/g, '');
    const normalizedAdminContact = ADMIN_CONTACT.replace(/\s/g, '');
    const trimmedName = name.trim();

    let adminData = null;
    let isSuperAdmin = false;

    // Check if it's super admin
    if (trimmedName === ADMIN_NAME.trim() && normalizedContact === normalizedAdminContact) {
      adminData = {
        name: ADMIN_NAME,
        contact: ADMIN_CONTACT,
        type: 'super_admin'
      };
      isSuperAdmin = true;
    } else {
      // Check if it's a sub-admin
      await connectDB();
      const subAdmin = await SubAdmin.findOne({
        name: trimmedName,
        contact: { $regex: new RegExp(`^${normalizedContact}$`, 'i') }
      });

      if (subAdmin) {
        adminData = {
          name: subAdmin.name,
          contact: subAdmin.contact,
          type: 'sub_admin',
          id: subAdmin._id.toString()
        };
      }
    }

    // If no admin found, return error
    if (!adminData) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        name: adminData.name,
        contact: adminData.contact,
        type: adminData.type,
        isSuperAdmin: isSuperAdmin,
        id: adminData.id || null
      },
      JWT_SECRET,
      { expiresIn: `${JWT_EXPIRY_DAYS}d` }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        name: adminData.name,
        contact: adminData.contact,
        type: adminData.type,
        isSuperAdmin: isSuperAdmin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Verify token middleware (can be used in other routes)
const verifyAdminToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = { loginAdmin, verifyAdminToken };

