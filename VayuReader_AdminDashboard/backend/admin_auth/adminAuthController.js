const jwt = require('jsonwebtoken');

const ADMIN_NAME = process.env.ADMIN_NAME || 'Himanshu Bhatt';
const ADMIN_CONTACT = process.env.ADMIN_CONTACT || '89200 67341';
const JWT_SECRET = process.env.JWT_SECRET || 'admin-secret-key';
const JWT_EXPIRY_DAYS = process.env.JWT_EXPIRY_DAYS || '1';

// Login admin with name and contact
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

    // Check credentials
    if (name.trim() !== ADMIN_NAME.trim() || normalizedContact !== normalizedAdminContact) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        name: ADMIN_NAME,
        contact: ADMIN_CONTACT,
        type: 'admin'
      },
      JWT_SECRET,
      { expiresIn: `${JWT_EXPIRY_DAYS}d` }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        name: ADMIN_NAME,
        contact: ADMIN_CONTACT
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

