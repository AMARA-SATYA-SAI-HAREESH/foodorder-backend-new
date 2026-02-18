const express = require("express");
const router = express.Router();
const otpController = require("../controllers/otpController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const OTP = require("../models/OtpModel");
const User = require("../models/userModel");
const { sendOTPEmail } = require("../services/emailService");

// Generate OTP when driver arrives
router.post(
  "/:orderId/generate",
  authMiddleware,
  (req, res, next) => {
    if (req.userType === "driver") {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: "Driver access only",
      });
    }
  },
  otpController.generateDeliveryOTP,
);

// Verify OTP to complete delivery
router.post(
  "/:orderId/verify",
  authMiddleware,
  (req, res, next) => {
    if (req.userType === "driver") {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: "Driver access only",
      });
    }
  },
  otpController.verifyDeliveryOTP,
);

// Generate and send OTP
router.post("/send", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email, verified: false });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to database
    await OTP.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send email
    await sendOTPEmail(email, otp);

    res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("OTP send error:", error);

    // Send more specific error message
    if (error.message.includes("credentials")) {
      res.status(500).json({
        success: false,
        message: "Email service not configured. Please contact support.",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again.",
      });
    }
  }
});

// Verify OTP
router.post("/verify", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const otpRecord = await OTP.findOne({
      email,
      otp,
      verified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Mark as verified
    otpRecord.verified = true;
    await otpRecord.save();

    res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("OTP verify error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
});
module.exports = router;
