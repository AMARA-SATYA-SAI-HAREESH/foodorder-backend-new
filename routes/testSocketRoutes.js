const express = require("express");
const router = express.Router();
const { emitToDriver } = require("../config/socket");

router.post("/notify-driver/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;

    console.log("📨 Test notification requested for driver:", driverId);

    if (!driverId) {
      return res.status(400).json({
        success: false,
        error: "Driver ID is required",
      });
    }

    // Send test notification
    const sent = emitToDriver(driverId, "new-assignment", {
      orderId: `TEST_${Date.now()}`,
      message: "Test notification from Socket.IO",
      restaurantName: "Test Restaurant",
      amount: "₹250",
      timestamp: new Date(),
    });

    if (sent) {
      res.json({
        success: true,
        message: `Test sent to driver ${driverId}`,
      });
    } else {
      res.json({
        success: false,
        message: `Driver ${driverId} is not connected`,
      });
    }
  } catch (error) {
    console.error("Test notification error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
