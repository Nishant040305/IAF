const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const User = require('../Models/User');
const { generateToken } = require('../utils/jwt');

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
const OTP_GATEWAY_URL =
  process.env.OTP_GATEWAY_URL || 'http://msg.com:8080/smsc/sends msg';

const buildOtpUrl = (to, otp) => {
  // Handle the space in the provided path by URL-encoding it
  const base = OTP_GATEWAY_URL.replace(' ', '%20');
  const url = new URL(base);
  url.searchParams.set('from', 'VAYUREADER');
  url.searchParams.set('to', to);
  url.searchParams.set('text', `Your OTP code for Login : ${otp} - VayuReader`);
  console.log('Built OTP URL:', url.toString());
  return url;
};

const sendOtpSms = async (to, otp) => {
  const devMode = process.env.SKIP_OTP_SEND === 'true';
  // In dev/test you can skip the real SMS send by setting SKIP_OTP_SEND=true
  if (devMode) {
    console.log(`[DEV] OTP to ${to}: ${otp}`);
    return { devMode: true };
  }

  return new Promise((resolve, reject) => {
    try {
      const url = buildOtpUrl(to, otp);
      const client = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        timeout: 10000 // 10 second timeout
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ devMode: false });
          } else {
            reject(new Error(`OTP gateway error: ${res.statusCode} ${res.statusMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Failed to send OTP: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('OTP gateway request timeout'));
      });

      req.end();
    } catch (error) {
      reject(new Error(`Invalid OTP gateway URL: ${error.message}`));
    }
  });
};

// Request OTP for login (with name and phone number)
const requestLoginOtp = async (req, res) => {
  try {
    const { phone_number, name } = req.body;

    if (!name || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone number are required'
      });
    }

    // Find or create user
    let user = await User.findOne({ phone_number });

    if (!user) {
      // Create new user with name and phone number
      user = new User({ name, phone_number });
    } else {
      // Update name if provided and different
      if (name && user.name !== name) {
        user.name = name;
      }
    }

    // Generate and save OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    user.otpCode = otp;
    user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await user.save();

    // Send OTP via SMS
    let sendResult;
    try {
      sendResult = await sendOtpSms(phone_number, otp);
    } catch (smsError) {
      console.error('OTP Send Error:', smsError);
      // Still return success if OTP was saved, but indicate SMS failed
      // This allows users to verify OTP even if SMS gateway fails (in dev mode)
      const devMode = process.env.SKIP_OTP_SEND === 'true';
      if (devMode) {
        return res.json({
          success: true,
          message: 'OTP generated (DEV MODE - SMS skipped)',
          otp: otp
        });
      }
      return res.status(502).json({
        success: false,
        message: 'Failed to send OTP via SMS',
        error: smsError.message
      });
    }

    const devMode = sendResult?.devMode === true;
    res.json({
      success: true,
      message: devMode ? 'OTP generated (DEV MODE - SMS skipped)' : 'OTP sent successfully',
      ...(devMode ? { otp } : {}) // return OTP only in explicit dev mode for local testing
    });
  } catch (error) {
    console.error('Request OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Verify OTP and complete login
const verifyLoginOtp = async (req, res) => {
  try {
    const { phone_number, otp } = req.body;

    if (!phone_number || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    const user = await User.findOne({ phone_number });
    if (!user || !user.otpCode || !user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: 'No active OTP for this number. Please request OTP first.'
      });
    }

    const now = new Date();
    if (now > user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      });
    }

    if (user.otpCode !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Clear OTP after successful verification
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    // Generate JWT token (24 hours expiry from .env)
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone_number: user.phone_number
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const getProfile = async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};

module.exports = { requestLoginOtp, verifyLoginOtp, getProfile };