const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { 
  uploadPdfMetadata, 
  updatePdf, 
  deletePdf, 
  getAllPdfs 
} = require('../controllers/pdfController');
const { verifyAdminToken } = require('../../../VayuReader_Backend/admin_auth/adminAuthController');

router.get('/', verifyAdminToken, getAllPdfs);
router.post('/upload', verifyAdminToken, upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), uploadPdfMetadata);
router.put('/:id', verifyAdminToken, upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), updatePdf);
router.delete('/:id', verifyAdminToken, deletePdf);

module.exports = router;