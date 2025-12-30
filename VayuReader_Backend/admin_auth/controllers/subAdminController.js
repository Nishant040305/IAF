const SubAdmin = require('../models/SubAdmin');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const ADMIN_NAME = process.env.ADMIN_NAME || 'Himanshu Bhatt';
const ADMIN_CONTACT = process.env.ADMIN_CONTACT || '89200 67341';
const MONGODB_URI = process.env.MONGODB_URI;

// Connect to MongoDB
let dbConnected = false;
const connectDB = async () => {
  // Check if already connected
  if (mongoose.connection.readyState === 1) {
    dbConnected = true;
    return;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    // Only connect if not already connecting or connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
    dbConnected = true;
    console.log('✅ Connected to MongoDB for sub-admin management');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB for sub-admin management:', error.message);
    dbConnected = false;
    throw error;
  }
};

// Check if current user is super admin
const isSuperAdmin = (req, res, next) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Check if it's the super admin from .env
    const normalizedContact = (admin.contact || '').replace(/\s/g, '');
    const normalizedAdminContact = ADMIN_CONTACT.replace(/\s/g, '');

    if (admin.name === ADMIN_NAME && normalizedContact === normalizedAdminContact) {
      req.isSuperAdmin = true;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Only super admin can perform this action'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking admin privileges',
      error: error.message
    });
  }
};

// Get all sub-admins
const getAllSubAdmins = async (req, res) => {
  try {
    // Ensure MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    
    const subAdmins = await SubAdmin.find({})
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: subAdmins
    });
  } catch (error) {
    console.error('Error fetching sub-admins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sub-admins',
      error: error.message
    });
  }
};

// Create a new sub-admin
const createSubAdmin = async (req, res) => {
  try {
    // Ensure MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    
    const { name, contact } = req.body;

    // Validate input
    if (!name || !contact) {
      return res.status(400).json({
        success: false,
        message: 'Name and contact are required'
      });
    }

    // Normalize contact
    const normalizedContact = contact.replace(/\s/g, '');

    // Check if contact already exists (including super admin)
    if (normalizedContact === ADMIN_CONTACT.replace(/\s/g, '')) {
      return res.status(400).json({
        success: false,
        message: 'This contact is already registered as super admin'
      });
    }

    // Check if sub-admin already exists
    const existing = await SubAdmin.findOne({ 
      contact: { $regex: new RegExp(`^${normalizedContact}$`, 'i') }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Sub-admin with this contact already exists'
      });
    }

    // Create new sub-admin
    const newSubAdmin = new SubAdmin({
      name: name.trim(),
      contact: normalizedContact,
      createdBy: req.admin.name || 'Super Admin'
    });

    await newSubAdmin.save();

    res.status(201).json({
      success: true,
      message: 'Sub-admin created successfully',
      data: newSubAdmin
    });
  } catch (error) {
    console.error('Error creating sub-admin:', error);
    
    // Provide more detailed error message
    let errorMessage = 'Failed to create sub-admin';
    if (error.code === 11000) {
      errorMessage = 'Sub-admin with this contact already exists';
    } else if (error.message.includes('MONGODB_URI')) {
      errorMessage = 'Database connection not configured';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      code: error.code
    });
  }
};

// Delete a sub-admin
const deleteSubAdmin = async (req, res) => {
  try {
    // Ensure MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    
    const { id } = req.params;

    const subAdmin = await SubAdmin.findByIdAndDelete(id);

    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Sub-admin not found'
      });
    }

    res.json({
      success: true,
      message: 'Sub-admin deleted successfully',
      data: subAdmin
    });
  } catch (error) {
    console.error('Error deleting sub-admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sub-admin',
      error: error.message
    });
  }
};

module.exports = {
  isSuperAdmin,
  getAllSubAdmins,
  createSubAdmin,
  deleteSubAdmin
};

