const express = require('express');
const router = express.Router();
const { 
  addDictionaryWord, 
  updateDictionaryWord, 
  deleteDictionaryWord, 
  getAllDictionaryWords 
} = require('../controllers/dictionaryController');
const { verifyAdminToken } = require('../../../VayuReader_Backend/admin_auth/adminAuthController');

router.get('/', verifyAdminToken, getAllDictionaryWords);
router.post('/', verifyAdminToken, addDictionaryWord);
router.put('/:id', verifyAdminToken, updateDictionaryWord);
router.delete('/:id', verifyAdminToken, deleteDictionaryWord);

module.exports = router;
