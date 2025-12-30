const express = require('express');
const router = express.Router();
const {
  requestLoginOtp,
  verifyLoginOtp,
  getProfile
} = require('../controllers/authController');
const {
  requestLoginOtpSchema,
  verifyLoginOtpSchema
} = require('../schemas/authSchemas');
const validate = require('../middleware/validation');
const auth = require('../middleware/auth');

// OTP-based login flow
router.post('/login/request-otp', validate(requestLoginOtpSchema), requestLoginOtp);
router.post('/login/verify-otp', validate(verifyLoginOtpSchema), verifyLoginOtp);

// Get user profile (requires authentication)
router.get('/profile', auth, getProfile);

module.exports = router;