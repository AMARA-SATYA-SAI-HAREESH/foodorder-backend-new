// server.js or app.js
const Razorpay = require("razorpay");
const crypto = require("crypto");
const express = require("express");
const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay Order
router.post("/create-razorpay-order", async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body;
    console.log("✅ Razorpay order request received:", req.body);
    console.log(
      "✅ Razorpay Key ID:",
      process.env.RAZORPAY_KEY_ID ? "Set" : "Missing"
    );

    const options = {
      amount: amount * 100, // Convert to paise
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
    console.error("❌ Razorpay error:", error);
  }
});

// Verify Payment
router.post("/verify-payment", (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      res.json({
        success: true,
        paymentDetails: {
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature,
        },
      });
    } else {
      res.status(400).json({ success: false, error: "Invalid signature" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
    console.error("❌ Razorpay error:", error);
  }
});

module.exports = router;
