const express = require("express");
const router = express.Router();
const driverController = require("../controllers/driverController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const driverMiddleware = require("../middlewares/driverMiddleware");
const Order = require("../models/orderModel");
const Driver = require("../models/Driver");
const { adminMiddleware } = require("../middlewares/adminMiddleware");
// ========== ADMIN ONLY ROUTES (No driver middleware) ==========
// Update driver verification (ADMIN ONLY)
router.put(
  "/verification",
  authMiddleware,
  adminMiddleware,
  driverController.updateDriverVerification
);
// Get all drivers (ADMIN ONLY)
router.get(
  "/all",
  authMiddleware,
  adminMiddleware,
  driverController.getAllDrivers
);

// Admin deletes any driver (ADMIN ONLY)
router.delete(
  "/admin/delete",
  authMiddleware,
  adminMiddleware,
  driverController.deleteDriverAccount
);
// Apply auth middleware to all routes
router.use(authMiddleware);

// Apply driver middleware
router.use(driverMiddleware);

// ========== PROFILE & SETTINGS ==========

// 1. Get Driver Profile
router.get("/profile", driverController.getDriverProfile);

// 2. Update Location
router.put("/location", driverController.updateLocation);

// 3. Toggle Online Status
router.put("/online-status", driverController.toggleOnlineStatus);

// 4. Set Availability
router.put("/availability", async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { isAvailable } = req.body;

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      { isAvailable, lastActive: new Date() },
      { new: true }
    );

    res.json({
      success: true,
      message: `You are now ${isAvailable ? "available" : "unavailable"}`,
      isAvailable: driver.isAvailable,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========== ORDER MANAGEMENT ==========

// 5. Get Available Orders
router.get("/orders/available", driverController.getAvailableOrders);

// 6. Accept Order
router.post("/orders/accept", driverController.acceptOrder);

// 7. Update Order Status
router.put("/orders/status", driverController.updateOrderStatus);

// 8. Get Current Order
router.get("/orders/current", driverController.getCurrentOrder);

// 9. Get Order History
router.get("/orders/history", async (req, res) => {
  try {
    const driverId = req.driver._id;
    const orders = await Order.find({ driverId })
      .populate("restaurantId", "name")
      .populate("buyer", "userName")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========== ACCOUNT MANAGEMENT ==========

// Delete own account (DRIVER SELF-DELETE)
router.delete("/delete-account", driverController.deleteMyAccount);

// ========== TEST ROUTES ==========

// 10. Test route
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Driver routes are working",
    user: req.userId,
    driver: req.driver._id,
    timestamp: new Date().toISOString(),
  });
});

// 11. Test driver info
router.get("/info", (req, res) => {
  res.json({
    success: true,
    driver: {
      id: req.driver._id,
      vehicleNumber: req.driver.vehicleNumber,
      isOnline: req.driver.isOnline,
      isAvailable: req.driver.isAvailable,
      currentOrder: req.driver.currentOrder,
    },
  });
});

module.exports = router;
