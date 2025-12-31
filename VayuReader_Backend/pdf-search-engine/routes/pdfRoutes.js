const express = require("express");
const PdfDocument = require("../models/pdfDocument");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const { unifiedAuth, adminOnly } = require("../../admin_auth/middleware/unifiedAuth");
const { logAction } = require("../../admin_auth/utils/auditLogger");
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "uploads/"); // This folder must exist
//   },
//   filename: function (req, file, cb) {
//     const ext = path.extname(file.originalname);
//     cb(null, uuidv4() + ext); // adding unique identifier to handle dupes
//   },
// });


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    
    if (!req.folderName) {
      req.folderName = uuidv4();
    }
    const uploadPath = path.join("uploads", req.folderName);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "application/pdf" ||
    file.mimetype.startsWith("image/")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and image files are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter });

// Health check for GET /api/pdfs
router.get("/health/search", (req, res) => {
  res.json({ status: "ok", route: "GET /api/pdfs?search=" });
});

// Health check for POST /api/pdfs/upload
router.get("/health/upload", (req, res) => {
  res.json({ status: "ok", route: "POST /api/pdfs/upload" });
});

// Health check for GET /api/pdfs/all
router.get("/health/all", (req, res) => {
  res.json({ status: "ok", route: "GET /api/pdfs/all" });
});

// Health check for GET /api/pdfs/:id
router.get("/health/:id", (req, res) => {
  res.json({ status: "ok", route: `GET /api/pdfs/${req.params.id}` });
});

// GET /api/pdfs?search=... (authenticated users can read)
router.get("/", unifiedAuth, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } }
        ],
      };
    }
    let documents = await PdfDocument.find(query);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pdfs (add PDF metadata, not file)
// router.post("/", async (req, res) => {
//   try {
//     const { title, content, pdfUrl, category, thumbnail } = req.body;
//     const newDocument = new PdfDocument({
//       title,
//       content,
//       pdfUrl,
//       category,
//       thumbnail,
//       viewCount: 0
//     });
//     const savedDocument = await newDocument.save();
//     res.status(201).json(savedDocument);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

// GET /api/pdfs/all (authenticated users can read, admin can manage)
router.get("/all", unifiedAuth, async (req, res) => {
  try {
    const documents = await PdfDocument.find({}).sort({ createdAt: -1 });
    console.log(`Retrieved ${documents} documents`);
    res.json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/pdfs/upload (admin only)
router.post("/upload", adminOnly, upload.fields([
  { name: "pdf", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const pdfFile = req.files["pdf"] ? req.files["pdf"][0] : null;
    const thumbnailFile = req.files["thumbnail"] ? req.files["thumbnail"][0] : null;

    if (!pdfFile) {
      return res.status(400).json({ message: "PDF file is required" });
    }

    const pdfUrl = `/${pdfFile.path.replace(/\\/g, "/")}`;
const thumbnail = thumbnailFile ? `/${thumbnailFile.path.replace(/\\/g, "/")}` : undefined;
    // Converting the pdfUrl in the form /uploads/<subfolder>/<uuid>.pdf


    const newDoc = new PdfDocument({
      title,
      content,
      pdfUrl,
      category,
      thumbnail,
      viewCount: 0
    });

    await newDoc.save();

    // Log audit action
    await logAction('CREATE', 'PDF', newDoc._id, req.admin, {
      title: newDoc.title,
      category: newDoc.category,
      pdfUrl: newDoc.pdfUrl
    });

    res.status(201).json({ success: true, message: "PDF uploaded & saved", data: newDoc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Upload failed", error: err.message });
  }
});

// PUT /api/pdfs/:id (admin only)
router.put("/:id", adminOnly, upload.fields([
  { name: "pdf", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const pdfFile = req.files["pdf"] ? req.files["pdf"][0] : null;
    const thumbnailFile = req.files["thumbnail"] ? req.files["thumbnail"][0] : null;

    // Get old data for audit log
    const oldData = await PdfDocument.findById(req.params.id);
    if (!oldData) {
      return res.status(404).json({ success: false, error: "PDF not found" });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (category) updateData.category = category;

    if (pdfFile) {
      updateData.pdfUrl = `/${pdfFile.path.replace(/\\/g, "/")}`;
    }

    if (thumbnailFile) {
      updateData.thumbnail = `/${thumbnailFile.path.replace(/\\/g, "/")}`;
    }

    const updated = await PdfDocument.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Log audit action
    await logAction('UPDATE', 'PDF', updated._id, req.admin, {
      old: oldData ? { title: oldData.title, category: oldData.category } : null,
      new: { title: updated.title, category: updated.category }
    });

    res.json({ success: true, message: "PDF updated successfully", data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/pdfs/:id (admin only)
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    const pdf = await PdfDocument.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ success: false, error: "PDF not found" });
    }

    // Delete files if they exist
    try {
      if (pdf.pdfUrl) {
        const pdfPath = path.join(__dirname, '..', pdf.pdfUrl);
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
          // Also try to delete the parent folder if it's empty
          const folderPath = path.dirname(pdfPath);
          try {
            const files = fs.readdirSync(folderPath);
            if (files.length === 0) {
              fs.rmdirSync(folderPath);
            }
          } catch (e) {
            // Ignore if folder not empty or can't delete
          }
        }
      }
      if (pdf.thumbnail) {
        const thumbPath = path.join(__dirname, '..', pdf.thumbnail);
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
        }
      }
    } catch (fileError) {
      console.error('Error deleting files:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    const deleted = await PdfDocument.findByIdAndDelete(req.params.id);
    
    // Log audit action
    await logAction('DELETE', 'PDF', deleted._id, req.admin, {
      title: deleted.title,
      category: deleted.category,
      pdfUrl: deleted.pdfUrl
    });
    
    res.json({ success: true, message: "PDF deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// (get single PDF and increment view count) - authenticated users can read
router.get("/:id", unifiedAuth, async (req, res) => {
  try {
    const pdf = await PdfDocument.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );
    if (!pdf) {
      return res.status(404).json({ error: "PDF not found" });
    }
    res.json(pdf);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;
