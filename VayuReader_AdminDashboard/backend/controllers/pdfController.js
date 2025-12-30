const fs = require("fs");
const path = require("path");
const { convert } = require("pdf-poppler");
const { v4: uuidv4 } = require("uuid");
const Pdf = require("../models/Pdf");

const uploadPdfMetadata = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const pdfFile = req.files?.pdf?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];

    if (!title || !content || !category || !pdfFile) {
      return res.status(400).json({ msg: "Missing required fields." });
    }

    const folderName = req.folderName; // set by multer
    const uploadDir = path.join(__dirname, "../uploads", folderName);
    let thumbnailPath;

    if (thumbnailFile) {
      thumbnailPath = `/uploads/${folderName}/${thumbnailFile.filename}`;
    } else {
      const inputPath = pdfFile.path;
      const timestamp = Date.now();
      const outputPrefix = `thumb_${timestamp}`;

      console.log("📦 Converting PDF to thumbnail...");

      await convert(inputPath, {
        format: "png",
        out_dir: uploadDir,
        out_prefix: outputPrefix,
        page: 1,
      });

      const base1 = path.join(uploadDir, `${outputPrefix}-1.png`);
      const base01 = path.join(uploadDir, `${outputPrefix}-01.png`);

      if (fs.existsSync(base1)) {
        thumbnailPath = `/uploads/${folderName}/${path.basename(base1)}`;
      } else if (fs.existsSync(base01)) {
        thumbnailPath = `/uploads/${folderName}/${path.basename(base01)}`;
      } else {
        console.error("❌ Thumbnail file not found.");
        return res.status(500).json({ msg: "Thumbnail generation failed." });
      }

      console.log("✅ Thumbnail saved at:", thumbnailPath);
    }

    const newPdf = new Pdf({
      title,
      content,
      category,
      pdf: `/uploads/${folderName}/${pdfFile.filename}`,
      thumbnail: thumbnailPath,
    });

    await newPdf.save();

    res.status(200).json({
      msg: "✅ Uploaded successfully",
      pdfPath: `/uploads/${folderName}/${pdfFile.filename}`,
      thumbnailPath: thumbnailPath,
    });
  } catch (error) {
    console.error("❌ Error in uploadPdfMetadata:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

const updatePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category } = req.body;
    const pdfFile = req.files?.pdf?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];

    const updateData = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (category) updateData.category = category;

    if (pdfFile) {
      const folderName = req.folderName || uuidv4();
      updateData.pdf = `/uploads/${folderName}/${pdfFile.filename}`;
    }

    if (thumbnailFile) {
      const folderName = req.folderName || uuidv4();
      updateData.thumbnail = `/uploads/${folderName}/${thumbnailFile.filename}`;
    }

    const updated = await Pdf.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!updated) {
      return res.status(404).json({ success: false, msg: 'PDF not found' });
    }

    res.json({ success: true, msg: 'PDF updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating PDF:', error);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
};

const deletePdf = async (req, res) => {
  try {
    const { id } = req.params;

    const pdf = await Pdf.findById(id);
    if (!pdf) {
      return res.status(404).json({ success: false, msg: 'PDF not found' });
    }

    // Delete files if they exist
    if (pdf.pdf) {
      const pdfPath = path.join(__dirname, '..', pdf.pdf);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }
    if (pdf.thumbnail) {
      const thumbPath = path.join(__dirname, '..', pdf.thumbnail);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }

    await Pdf.findByIdAndDelete(id);

    res.json({ success: true, msg: 'PDF deleted successfully' });
  } catch (error) {
    console.error('Error deleting PDF:', error);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
};

const getAllPdfs = async (req, res) => {
  try {
    const pdfs = await Pdf.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: pdfs });
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    res.status(500).json({ success: false, msg: 'Server error', error: error.message });
  }
};

module.exports = { uploadPdfMetadata, updatePdf, deletePdf, getAllPdfs };
