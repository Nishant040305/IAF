const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  getProfile,
  requestOtp,
  verifyOtp
} = require('../controllers/authController');
const {
  signupSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema
} = require('../schemas/authSchemas');
const validate = require('../middleware/validation');
const auth = require('../middleware/auth');

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/profile', auth, getProfile);

// OTP-based signup/login
router.post('/request-otp', validate(requestOtpSchema), requestOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);

module.exports = router;