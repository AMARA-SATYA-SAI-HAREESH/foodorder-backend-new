const express = require("express");
const router = express.Router();
const otpController = require("../controllers/otpController");
const { authMiddleware } = require("../middlewares/authMiddleware");

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
        message: "Driver access only"
      });
    }
  },
  otpController.generateDeliveryOTP
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
        message: "Driver access only"
      });
    }
  },
  otpController.verifyDeliveryOTP
);

module.exports = router;