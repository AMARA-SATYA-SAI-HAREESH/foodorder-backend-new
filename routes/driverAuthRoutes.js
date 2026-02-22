const express = require("express");
const router = express.Router();
const driverAuthController = require("../controllers/driverAuthController");

// PUBLIC ROUTES - NO AUTH NEEDED

// 1. Check availability
router.get("/check", driverAuthController.checkAvailability);

// 2. Driver Registration
router.post("/register", driverAuthController.registerDriver);

// 3. Driver Login
router.post("/login", driverAuthController.loginDriver);

// 4. Test route
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Driver auth routes are working",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
