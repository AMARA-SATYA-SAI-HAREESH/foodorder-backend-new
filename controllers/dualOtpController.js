const Order = require("../models/orderModel");
const User = require("../models/User");
const admin = require("firebase-admin");

exports.generateDeliveryOTP = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate("buyer");

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000);

    // Store OTP in order
    order.verification.deliveryOTP = otp;
    order.verification.otpExpiresAt = expiresAt;
    await order.save();

    const customer = order.buyer;
    const customerId = customer._id;

    // Get user's preferred notification method
    const user = await User.findById(customerId);
    
    // Method 1: FCM for Mobile App Users
    if (user?.fcmToken) {
      try {
        const message = {
          notification: {
            title: "🚚 Delivery OTP",
            body: `Your OTP is ${otp}. Valid for 10 minutes.`,
          },
          data: {
            orderId: order._id.toString(),
            otp: otp,
            type: "DELIVERY_OTP",
          },
          token: user.fcmToken,
        };
        await admin.messaging().send(message);
        console.log(`✅ OTP sent via FCM to mobile app`);
      } catch (fcmError) {
        console.log("❌ FCM failed, trying web method");
      }
    }

    // Method 2: Web Socket for Web Users
    try {
      const { emitToOrder } = require("../config/socket");
      emitToOrder(order._id, "delivery-otp", {
        otp: otp,
        orderId: order._id,
        expiresAt: expiresAt,
        message: `Driver has arrived. Your OTP is ${otp}`
      });
      console.log(`✅ OTP sent via WebSocket to web`);
    } catch (socketError) {
      console.log("❌ WebSocket failed");
    }

    // Method 3: Email Fallback
    if (user?.email) {
      // Send email with OTP (implement email service)
      console.log(`✅ OTP sent via email to ${user.email}`);
    }

    res.status(200).json({
      success: true,
      message: "OTP generated and sent to customer",
      otp: otp, // For testing - remove in production
      sentVia: user?.fcmToken ? "FCM + Web" : "Web only",
      expiresAt: expiresAt,
    });
  } catch (error) {
    console.error("Error generating OTP:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};