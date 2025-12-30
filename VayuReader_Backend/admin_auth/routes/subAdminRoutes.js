const express = require('express');
const router = express.Router();
const { verifyAdminToken } = require('../adminAuthController');
const { isSuperAdmin, getAllSubAdmins, createSubAdmin, deleteSubAdmin } = require('../controllers/subAdminController');

// All routes require authentication
router.use(verifyAdminToken);

// Get all sub-admins (super admin only)
router.get('/', isSuperAdmin, getAllSubAdmins);

// Create a new sub-admin (super admin only)
router.post('/', isSuperAdmin, createSubAdmin);

// Delete a sub-admin (super admin only)
router.delete('/:id', isSuperAdmin, deleteSubAdmin);

module.exports = router;

