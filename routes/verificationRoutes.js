const express = require("express");
const router = express.Router();
const VerificationController = require("../controllers/verificationController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { vendorMiddleware } = require("../middlewares/vendorMiddleware");
const driverMiddleware = require("../middlewares/driverMiddleware");

// ✅ Public test endpoint
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Verification API is working",
    endpoints: {
      generateQR: "GET /:orderId/qr-data (VENDOR)",
      verifyPickup: "POST /:orderId/verify-pickup (DRIVER)",
      verifyDelivery: "POST /:orderId/verify-delivery (DRIVER)",
      getDetails: "GET /:orderId/details (VENDOR/DRIVER)",
      manualVerify: "POST /:orderId/manual-verify (DRIVER)",
      refreshCodes: "POST /:orderId/refresh-codes (VENDOR)",
    },
  });
});

// ✅ Custom middleware to check if user is vendor or driver
const vendorOrDriverMiddleware = (req, res, next) => {
  if (req.userType === "vendor" || req.userType === "driver") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Access denied. Vendor or driver only.",
    });
  }
};

// ✅ Generate QR data (VENDOR ONLY)
router.get(
  "/:orderId/qr-data",
  authMiddleware,
  (req, res, next) => {
    if (req.userType === "vendor") {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: "Vendor access only",
      });
    }
  },
  VerificationController.generateQRData,
);

// ✅ Get verification details (VENDOR/DRIVER)
router.get(
  "/:orderId/details",
  authMiddleware,
  vendorOrDriverMiddleware,
  VerificationController.getVerificationDetails,
);

// ✅ Verify pickup via QR scan (DRIVER ONLY)
router.post(
  "/:orderId/verify-pickup",
  authMiddleware,
  driverMiddleware,
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
  VerificationController.verifyPickup,
);

// ✅ Verify delivery via OTP (DRIVER ONLY)
router.post(
  "/:orderId/verify-delivery",
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
  VerificationController.verifyDelivery,
);

// ✅ Manual verification fallback (DRIVER ONLY)
router.post(
  "/:orderId/manual-verify",
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
  VerificationController.manualVerification,
);

// ✅ Refresh verification codes (VENDOR ONLY)
router.post(
  "/:orderId/refresh-codes",
  authMiddleware,
  (req, res, next) => {
    if (req.userType === "vendor") {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: "Vendor access only",
      });
    }
  },
  VerificationController.refreshVerificationCodes,
);

// ✅ Verification status webhook (for external systems)
router.post("/webhook/status", (req, res) => {
  // This endpoint can be used for external integrations
  const { event, data } = req.body;

  console.log("Verification webhook received:", { event, data });

  // Process webhook events
  switch (event) {
    case "pickup_verified":
      // Handle pickup verification
      break;
    case "delivery_verified":
      // Handle delivery verification
      break;
    case "verification_failed":
      // Handle failed verification
      break;
  }

  res.status(200).json({ success: true, received: true });
});

// ✅ Update driver status (OUT_FOR_DELIVERY, etc.)
router.post(
  "/:orderId/driver-status",
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
  VerificationController.updateDriverStatus,
);

// Add this route
router.post(
  "/:orderId/complete-delivery",
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
  VerificationController.completeDelivery,
);
module.exports = router;
