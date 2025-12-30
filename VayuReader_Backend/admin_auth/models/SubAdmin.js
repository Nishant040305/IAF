const mongoose = require('mongoose');

const subAdminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  contact: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    default: 'Super Admin'
  }
}, {
  timestamps: true
});

// Index for faster queries
subAdminSchema.index({ contact: 1 });
subAdminSchema.index({ name: 1 });

module.exports = mongoose.model('SubAdmin', subAdminSchema);

