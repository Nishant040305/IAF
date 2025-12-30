const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

let isConnected = false;

// Connect to MongoDB for audit logging
const connectToAuditDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn('⚠️ MONGODB_URI not found for audit logging');
    return;
  }

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      isConnected = true;
      console.log('✅ Connected to MongoDB for audit logging');
    }
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB for audit logging:', error.message);
    isConnected = false;
  }
};

const logAction = async (action, resourceType, resourceId, admin, details = {}) => {
  try {
    await connectToAuditDB();
    
    if (!isConnected && mongoose.connection.readyState !== 1) {
      console.warn('⚠️ Skipping audit log - MongoDB not connected');
      return;
    }
    
    const auditLog = new AuditLog({
      action,
      resourceType,
      resourceId: resourceId ? resourceId.toString() : 'unknown',
      adminName: admin?.name || 'Unknown',
      adminContact: admin?.contact || 'Unknown',
      details,
      timestamp: new Date()
    });

    await auditLog.save();
    console.log(`✅ Audit log: ${action} ${resourceType} (ID: ${resourceId}) by ${admin?.name || 'Unknown'}`);
  } catch (error) {
    console.error('❌ Error logging audit action:', error.message);
    // Don't throw - audit logging should not break the main flow
  }
};

module.exports = { logAction };

