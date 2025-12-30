const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone_number: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    otpCode: {
      type: String
    },
    otpExpiresAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);
