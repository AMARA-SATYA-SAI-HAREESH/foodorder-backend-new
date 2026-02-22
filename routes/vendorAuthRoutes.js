// routes/vendorAuthRoutes.js
const express = require("express");
const {
  vendorRegister,
  vendorLogin,
  getVendorProfile,
  updateVendorProfile,
} = require("../controllers/vendorAuthController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { vendorMiddleware } = require("../middlewares/vendorMiddleware");

const router = express.Router();

// Public routes
router.post("/register", vendorRegister);
router.post("/login", vendorLogin);

// Protected routes (require vendor authentication)
router.get("/profile", authMiddleware, vendorMiddleware, getVendorProfile);
router.put("/profile", authMiddleware, vendorMiddleware, updateVendorProfile);

module.exports = router;
