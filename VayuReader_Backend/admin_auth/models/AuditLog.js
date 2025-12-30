const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE']
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['ABBREVIATION', 'PDF', 'DICTIONARY_WORD']
  },
  resourceId: {
    type: String,
    required: true
  },
  adminName: {
    type: String,
    required: true
  },
  adminContact: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ adminName: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

