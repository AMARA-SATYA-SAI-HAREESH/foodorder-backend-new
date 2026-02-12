const Order = require("../models/orderModel");
const User = require("../models/userModel");
const Driver = require("../models/Driver");
const admin = require("../config/firebase");

// 1. GENERATE & SEND OTP
exports.generateDeliveryOTP = async (req, res) => {
  try {
    console.log("🔐 [OTP] Generating delivery OTP...");
    const { orderId } = req.params;

    // Get driver ID from request - IMPORTANT FIX
    const driverId = req.userId || req.driver?._id;
    console.log("🔑 Driver ID from request:", driverId);
    console.log("👤 User type:", req.userType);

    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Driver not authenticated",
      });
    }

    console.log("🔍 Looking for order with ID:", orderId);
    const order = await Order.findById(orderId)
      .populate("buyer", "userName phone fcmToken")
      .populate("driverId", "vehicleNumber user");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.log("📦 Order found:", {
      orderId: order._id,
      orderDriverId: order.driverId?._id,
      orderDriverUserId: order.driverId?.user?._id,
      requestDriverId: driverId,
    });

    // Check driver authorization - FIXED
    // Try to match with driver._id OR driver.user._id
    const orderDriverId = order.driverId?._id?.toString();
    const orderDriverUserId = order.driverId?.user?._id?.toString();
    const requestDriverId = driverId.toString();

    console.log("🔍 Comparing IDs:", {
      orderDriverId,
      orderDriverUserId,
      requestDriverId,
    });

    // If neither matches, not authorized
    if (
      orderDriverId !== requestDriverId &&
      orderDriverUserId !== requestDriverId
    ) {
      console.log("🚫 Driver authorization failed");
      return res.status(403).json({
        success: false,
        message: "Not authorized - This order is assigned to another driver",
      });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

    // Initialize verification object if not exists
    if (!order.verification) {
      order.verification = {};
    }

    // Store OTP
    order.verification.deliveryOTP = otp;
    order.verification.otpExpiresAt = expiresAt;
    order.verification.otpGeneratedAt = new Date();
    await order.save();

    const customer = order.buyer;

    // 📱 Send FCM to Mobile App
    if (customer?.fcmToken) {
      try {
        const message = {
          notification: {
            title: "🚚 Delivery OTP",
            body: `Your OTP is ${otp}. Give to driver to complete delivery.`,
          },
          data: {
            orderId: order._id.toString(),
            otp: otp,
            driverName: order.driverId?.vehicleNumber || "Driver",
            expiresIn: "10",
          },
          token: customer.fcmToken,
          android: {
            priority: "high",
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
              },
            },
          },
        };

        await admin.messaging().send(message);
        console.log(`✅ [FCM] OTP ${otp} sent to ${customer.userName}`);
      } catch (fcmError) {
        console.error("❌ [FCM] Error:", fcmError.message);
        // Continue even if FCM fails
      }
    }

    // 🌐 Send to Web via Socket (if you have WebSocket)
    try {
      const { emitToOrder } = require("../config/socket");
      emitToOrder(order._id, "delivery-otp-generated", {
        otp: otp,
        orderId: order._id,
        driver: order.driverId?.vehicleNumber,
        expiresAt: expiresAt,
      });
    } catch (socketError) {
      console.log("ℹ️ WebSocket not available");
    }

    res.status(200).json({
      success: true,
      message: "OTP sent to customer",
      otp: otp, // For testing - show in driver app
      expiresAt: expiresAt,
      sentVia: customer?.fcmToken ? "FCM Push" : "Web Only",
    });
  } catch (error) {
    console.error("❌ [OTP] Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// 2. VERIFY OTP
exports.verifyDeliveryOTP = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { otp } = req.body;
    const driverId = req.userId || req.driver?._id;

    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Driver not authenticated",
      });
    }

    const order = await Order.findById(orderId).populate("driverId", "user");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check driver authorization - FIXED
    const orderDriverId = order.driverId?._id?.toString();
    const orderDriverUserId = order.driverId?.user?._id?.toString();
    const requestDriverId = driverId.toString();

    if (
      orderDriverId !== requestDriverId &&
      orderDriverUserId !== requestDriverId
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Check if verification exists
    if (!order.verification || !order.verification.deliveryOTP) {
      return res.status(400).json({
        success: false,
        message: "OTP not generated yet",
      });
    }

    // Check OTP
    if (order.verification.deliveryOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Check expiry
    if (order.verification.otpExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    // ✅ SUCCESS - Mark as delivered
    order.status = "DELIVERED";
    order.verification.deliveryVerifiedAt = new Date();
    order.actualDeliveryTime = new Date();
    order.verification.deliveryOTP = null; // Clear OTP

    // Add timeline
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      status: "DELIVERED",
      timestamp: new Date(),
      actor: "DRIVER",
      note: "Delivery completed with OTP verification",
    });

    await order.save();

    // Clear driver's current order
    await Driver.findByIdAndUpdate(order.driverId?._id, {
      $unset: { currentOrder: "" },
      $inc: { totalDeliveries: 1 },
      lastActive: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Delivery completed successfully!",
      order: {
        id: order._id,
        status: order.status,
        deliveredAt: order.actualDeliveryTime,
      },
    });
  } catch (error) {
    console.error("❌ [OTP Verification] Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
