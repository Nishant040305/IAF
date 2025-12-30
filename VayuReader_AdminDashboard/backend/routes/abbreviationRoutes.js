const express = require('express');
const router = express.Router();
const { 
  addAbbreviation, 
  updateAbbreviation, 
  deleteAbbreviation, 
  getAllAbbreviations 
} = require('../controllers/abbreviationController');
const { verifyAdminToken } = require('../../../VayuReader_Backend/admin_auth/adminAuthController');

router.get('/', verifyAdminToken, getAllAbbreviations);
router.post('/add', verifyAdminToken, addAbbreviation);
router.put('/:id', verifyAdminToken, updateAbbreviation);
router.delete('/:id', verifyAdminToken, deleteAbbreviation);

module.exports = router;
