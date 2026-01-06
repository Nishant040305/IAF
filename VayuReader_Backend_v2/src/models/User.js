/**
 * User Model
 * 
 * Represents application users who authenticate via OTP.
 * 
 * @module models/User
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        /**
         * User's full name.
         */
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [100, 'Name cannot exceed 100 characters']
        },

        /**
         * Phone number (unique identifier for login).
         */
        phone_number: {
            type: String,
            required: [true, 'Phone number is required'],
            unique: true,
            trim: true,
            index: true
        },

        /**
         * Temporary OTP code for authentication.
         * Cleared after successful verification.
         */
        otpCode: {
            type: String,
            select: false // Don't include in queries by default
        },

        /**
         * OTP expiration timestamp.
         */
        otpExpiresAt: {
            type: Date,
            select: false
        }
    },
    {
        timestamps: true
    }
);

// =============================================================================
// INDEXES
// =============================================================================

// phone_number index is handled in schema definition (index: true)

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * Sets OTP code and expiry for the user.
 * 
 * @param {string} otp - OTP code
 * @param {Date} expiresAt - Expiry timestamp
 */
userSchema.methods.setOtp = function (otp, expiresAt) {
    this.otpCode = otp;
    this.otpExpiresAt = expiresAt;
};

/**
 * Clears OTP fields after successful verification.
 */
userSchema.methods.clearOtp = function () {
    this.otpCode = undefined;
    this.otpExpiresAt = undefined;
};

/**
 * Returns safe user object for API responses.
 */
userSchema.methods.toSafeObject = function () {
    return {
        id: this._id,
        name: this.name,
        phone_number: this.phone_number
    };
};

module.exports = mongoose.model('User', userSchema);
