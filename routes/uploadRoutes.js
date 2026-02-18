const express = require("express");
const router = express.Router();
const { upload, cloudinary } = require("../config/cloudinary");
const { authMiddleware } = require("../middlewares/authMiddleware");

// Single image upload
router.post(
  "/image",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      res.json({
        success: true,
        imageUrl: req.file.path,
        publicId: req.file.filename,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// Multiple images upload
router.post(
  "/images",
  authMiddleware,
  upload.array("images", 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No files uploaded" });
      }

      const images = req.files.map((file) => ({
        url: file.path,
        publicId: file.filename,
      }));

      res.json({
        success: true,
        images,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// Delete image
router.delete("/image", authMiddleware, async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res
        .status(400)
        .json({ success: false, message: "Public ID required" });
    }

    await cloudinary.uploader.destroy(publicId);

    res.json({ success: true, message: "Image deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
