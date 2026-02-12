const Order = require("../models/orderModel");
const Driver = require("../models/Driver");
const crypto = require("crypto");

class VerificationController {
  // ✅ Generate QR data for order
  static async generateQRData(req, res) {
    try {
      const { orderId } = req.params;
      const vendorId = req.userId;

      const order = await Order.findById(orderId)
        .populate("restaurantId", "title vendorId")
        .populate("buyer", "userName phone");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Check if vendor owns this order's restaurant
      if (order.restaurantId.vendorId.toString() !== vendorId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this order",
        });
      }

      // Generate verification codes if not already generated
      if (
        !order.verification.pickupCode ||
        order.status !== "READY_FOR_PICKUP"
      ) {
        // Update status to READY_FOR_PICKUP to trigger code generation
        order.status = "READY_FOR_PICKUP";
        await order.save();
      }

      // Get updated order with codes
      const updatedOrder = await Order.findById(orderId);

      // QR data structure
      const qrData = {
        orderId: updatedOrder._id,
        pickupCode: updatedOrder.verification.pickupCode,
        restaurantId: updatedOrder.restaurantId._id,
        restaurantName: order.restaurantId.title,
        customerName: order.buyer?.userName || "Customer",
        timestamp: new Date().toISOString(),
        type: "PICKUP_VERIFICATION",
      };

      // Generate QR string (JSON encoded)
      const qrString = JSON.stringify(qrData);

      res.status(200).json({
        success: true,
        qrData,
        qrString,
        verification: updatedOrder.verification,
        order: {
          id: updatedOrder._id,
          status: updatedOrder.status,
          customerName: order.buyer?.userName,
          customerPhone: order.buyer?.phone,
          itemsCount: updatedOrder.food.length,
          amount: updatedOrder.payment.amount,
        },
      });
    } catch (error) {
      console.error("Error generating QR data:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ✅ Verify pickup via QR scan
  // static async verifyPickup(req, res) {
  //   try {
  //     const { orderId } = req.params;
  //     const { driverId, verificationCode, method = "QR" } = req.body;
  //     console.log("🔍 [BACKEND-PICKUP] Request received:", {
  //       orderId,
  //       driverId,
  //       verificationCode,
  //       method,
  //       timestamp: new Date().toISOString(),
  //     });

  //     if (!driverId || !verificationCode) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Driver ID and verification code are required",
  //       });
  //     }

  //     const order = await Order.findById(orderId)
  //       .populate("driverId", "vehicleNumber")
  //       .populate("restaurantId", "title address vendorId");

  //     // ✅ DEBUG 2: Log what's in database
  //     console.log("🔍 [BACKEND-PICKUP] Order from DB:", {
  //       found: !!order,
  //       orderId: order?._id,
  //       status: order?.status,
  //       driverId: order?.driverId?._id,
  //       pickupCodeInDB: order?.verification?.pickupCode,
  //       qrGeneratedAt: order?.verification?.qrGeneratedAt,
  //     });

  //     if (!order) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Order not found",
  //       });
  //     }

  //     // Check if driver is assigned to this order
  //     if (order.driverId?._id.toString() !== driverId.toString()) {
  //       return res.status(403).json({
  //         success: false,
  //         message: "You are not assigned to this order",
  //       });
  //     }

  //     // Check if order is ready for pickup
  //     if (order.status !== "READY_FOR_PICKUP" && order.status !== "ACCEPTED") {
  //       return res.status(400).json({
  //         success: false,
  //         message: `Order is ${order.status.toLowerCase()}, not ready for pickup`,
  //       });
  //     }
  //     // ✅ DEBUG 3: Log code comparison
  //     console.log("🔍 [BACKEND-PICKUP] Code comparison:", {
  //       enteredCode: verificationCode,
  //       storedCode: order.verification.pickupCode,
  //       match: order.verification.pickupCode === verificationCode,
  //     });
  //     // Verify the pickup code
  //     if (order.verification.pickupCode !== verificationCode) {
  //       console.log("❌ [BACKEND-PICKUP] Codes DON'T match!");
  //       // Track failed attempts
  //       order.verification.verificationAttempts += 1;
  //       order.verification.lastVerificationAttempt = new Date();
  //       await order.save();

  //       // Lock after 3 failed attempts
  //       if (order.verification.verificationAttempts >= 3) {
  //         return res.status(429).json({
  //           success: false,
  //           message: "Too many failed attempts. Please contact vendor.",
  //           locked: true,
  //         });
  //       }

  //       return res.status(400).json({
  //         success: false,
  //         message: "Invalid verification code",
  //         attemptsLeft: 3 - order.verification.verificationAttempts,
  //       });
  //     }

  //     // Check if QR is expired (2 hours)
  //     const qrAge =
  //       Date.now() - new Date(order.verification.qrGeneratedAt).getTime();
  //     const twoHours = 2 * 60 * 60 * 1000;

  //     if (qrAge > twoHours) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "QR code has expired. Please request a new one from vendor.",
  //         expired: true,
  //       });
  //     }

  //     // ✅ SUCCESS: Update order status
  //     order.status = "PICKED_UP";
  //     order.verification.pickupVerifiedAt = new Date();
  //     order.verification.pickupVerifiedBy = driverId;
  //     order.actualPickupTime = new Date();
  //     console.log("✅ [BACKEND-PICKUP] Codes MATCH! Proceeding...");

  //     // Add to timeline
  //     if (!order.timeline) order.timeline = [];
  //     order.timeline.push({
  //       status: "PICKED_UP",
  //       timestamp: new Date(),
  //       actor: "DRIVER",
  //       note: `Pickup verified via ${method} at restaurant`,
  //     });

  //     await order.save();

  //     // Update driver's current order status
  //     await Driver.findByIdAndUpdate(driverId, {
  //       // "currentOrder.status": "PICKED_UP",
  //       lastActive: new Date(),
  //     });

  //     // ✅ Emit real-time notifications
  //     try {
  //       const { emitToVendor, emitToOrder } = require("../config/socket");
  //       emitToVendor(order.restaurantId.vendorId, "order-picked-up", {
  //         orderId: order._id,
  //         driverId,
  //         pickupTime: order.actualPickupTime,
  //         method,
  //       });

  //       emitToOrder(order._id, "status-updated", {
  //         status: "PICKED_UP",
  //         message: "Order picked up by driver",
  //         timestamp: new Date(),
  //       });
  //     } catch (socketError) {
  //       console.log("Socket notification skipped:", socketError.message);
  //     }

  //     res.status(200).json({
  //       success: true,
  //       message: "Pickup verified successfully!",
  //       order: {
  //         id: order._id,
  //         status: order.status,
  //         nextStep: "Proceed to delivery",
  //         customerAddress: order.buyer?.address,
  //         deliveryOTP: order.verification.deliveryOTP, // Show OTP for delivery
  //       },
  //       timestamp: new Date(),
  //     });
  //   } catch (error) {
  //     console.error("Error verifying pickup:", error);
  //     res.status(500).json({
  //       success: false,
  //       message: "Internal server error",
  //     });
  //   }
  // }
  static async verifyPickup(req, res) {
    try {
      const { orderId } = req.params;
      const { verificationCode, method = "QR" } = req.body;

      // ✅ GET DRIVER ID FROM MIDDLEWARE, NOT FROM BODY
      const driverId = req.driver?._id;

      if (!driverId) {
        return res.status(401).json({
          success: false,
          message: "Driver authentication required",
        });
      }
      console.log("🔍 [BACKEND-PICKUP] Request received:", {
        orderId,
        driverId,
        verificationCode,
        method,
        timestamp: new Date().toISOString(),
      });

      if (!driverId || !verificationCode) {
        return res.status(400).json({
          success: false,
          message: "Driver ID and verification code are required",
        });
      }

      const order = await Order.findById(orderId)
        .populate("driverId", "vehicleNumber")
        .populate("restaurantId", "title address vendorId");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      console.log("🔍 [BACKEND-PICKUP] Order status:", order.status);

      // ✅ FIX 1: Allow BOTH "ACCEPTED" and "READY_FOR_PICKUP" status
      const allowedStatuses = ["ACCEPTED", "READY_FOR_PICKUP"];
      if (!allowedStatuses.includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: `Order is ${order.status.toLowerCase()}, not ready for pickup`,
          currentStatus: order.status,
          allowedStatuses: allowedStatuses,
        });
      }

      // Check if driver is assigned
      if (order.driverId?._id.toString() !== driverId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this order",
        });
      }

      console.log("🔍 [BACKEND-PICKUP] Code comparison:", {
        enteredCode: verificationCode,
        storedCode: order.verification.pickupCode,
        match: order.verification.pickupCode === verificationCode,
      });

      // Verify the pickup code
      if (order.verification.pickupCode !== verificationCode) {
        console.log("❌ [BACKEND-PICKUP] Codes DON'T match!");

        order.verification.verificationAttempts += 1;
        order.verification.lastVerificationAttempt = new Date();
        await order.save();

        if (order.verification.verificationAttempts >= 3) {
          return res.status(429).json({
            success: false,
            message: "Too many failed attempts. Please contact vendor.",
            locked: true,
          });
        }

        return res.status(400).json({
          success: false,
          message: "Invalid verification code",
          attemptsLeft: 3 - order.verification.verificationAttempts,
        });
      }

      // ✅ FIX 2: Different expiration rules for QR vs MANUAL
      if (method === "QR" && order.verification.qrGeneratedAt) {
        // QR codes expire after 2 hours
        // const qrAge =
        //   Date.now() - new Date(order.verification.qrGeneratedAt).getTime();
        // const twoHours = 2 * 60 * 60 * 1000;
        // if (qrAge > twoHours) {
        //   return res.status(400).json({
        //     success: false,
        //     message:
        //       "QR code has expired. Please request a new one from vendor.",
        //     expired: true,
        //     codeMatched: true, // IMPORTANT: Tell frontend codes DID match
        //   });
        // }
      }
      // For MANUAL method, NO expiration check!

      // ✅ SUCCESS: Update order status
      order.status = "PICKED_UP";
      order.verification.pickupVerifiedAt = new Date();
      order.verification.pickupVerifiedBy = driverId;
      order.actualPickupTime = new Date();
      console.log("✅ [BACKEND-PICKUP] Pickup verified successfully!");

      // Add to timeline
      if (!order.timeline) order.timeline = [];
      order.timeline.push({
        status: "PICKED_UP",
        timestamp: new Date(),
        actor: "DRIVER",
        note: `Pickup verified via ${method} at restaurant`,
      });

      await order.save();

      // Update driver
      await Driver.findByIdAndUpdate(driverId, {
        lastActive: new Date(),
      });

      res.status(200).json({
        success: true,
        message: "Pickup verified successfully!",
        method: method,
        order: {
          id: order._id,
          status: order.status,
          nextStep: "Proceed to delivery",
          customerAddress: order.buyer?.address,
          deliveryOTP: order.verification.deliveryOTP,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error verifying pickup:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
  // ✅ Verify delivery via OTP
  static async verifyDelivery(req, res) {
    try {
      const { orderId } = req.params;
      const { otp, driverId } = req.body;

      if (!otp || !driverId) {
        return res.status(400).json({
          success: false,
          message: "OTP and driver ID are required",
        });
      }

      const order = await Order.findById(orderId)
        .populate("driverId", "vehicleNumber userName")
        .populate("buyer", "userName phone");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Check if driver is assigned
      if (order.driverId?._id.toString() !== driverId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to deliver this order",
        });
      }

      // Check if order is out for delivery
      // if (order.status !== "READY_FOR_PICKUP") {
      //   return res.status(400).json({
      //     success: false,
      //     message: `Order is ${order.status.toLowerCase()}, not out for delivery`,
      //   });
      // }
      // ✅ CORRECT: Check if order is PICKED_UP (not READY_FOR_PICKUP)
      if (order.status !== "PICKED_UP") {
        return res.status(400).json({
          success: false,
          message: `Order is ${order.status.toLowerCase()}, not out for delivery. Please verify pickup first.`,
          currentStatus: order.status,
          requiredStatus: "PICKED_UP",
        });
      }

      // Verify OTP
      if (order.verification.deliveryOTP !== otp) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      // ✅ SUCCESS: Mark as delivered
      order.status = "DELIVERED";
      order.verification.deliveryVerifiedAt = new Date();
      order.actualDeliveryTime = new Date();

      // Add to timeline
      if (!order.timeline) order.timeline = [];
      order.timeline.push({
        status: "DELIVERED",
        timestamp: new Date(),
        actor: "DRIVER",
        note: "Delivery verified with OTP",
      });

      await order.save();

      // Clear driver's current order
      await Driver.findByIdAndUpdate(driverId, {
        $unset: { currentOrder: "" },
        $inc: { totalDeliveries: 1 },
        lastActive: new Date(),
      });

      // ✅ Emit real-time notifications
      try {
        const { emitToVendor, emitToOrder } = require("../config/socket");
        emitToVendor(order.restaurantId.vendorId, "order-delivered", {
          orderId: order._id,
          driverId,
          deliveryTime: order.actualDeliveryTime,
        });

        emitToOrder(order._id, "status-updated", {
          status: "DELIVERED",
          message: "Order delivered successfully!",
          timestamp: new Date(),
        });
      } catch (socketError) {
        console.log("Socket notification skipped:", socketError.message);
      }

      res.status(200).json({
        success: true,
        message: "Delivery verified successfully!",
        order: {
          id: order._id,
          status: order.status,
          deliveredAt: order.actualDeliveryTime,
          customerName: order.buyer?.userName,
        },
      });
    } catch (error) {
      console.error("Error verifying delivery:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ✅ Get verification details (for vendor/driver)
  static async getVerificationDetails(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.userId;
      const userType = req.userType;

      const order = await Order.findById(orderId)
        .populate("restaurantId", "title vendorId")
        .populate("driverId", "vehicleNumber userName")
        .populate("buyer", "userName phone");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Authorization check
      let isAuthorized = false;

      if (userType === "vendor") {
        // Vendor can see their own orders
        isAuthorized =
          order.restaurantId.vendorId.toString() === userId.toString();
      } else if (userType === "driver") {
        // Driver can see assigned orders
        isAuthorized = order.driverId?._id.toString() === userId.toString();
      } else if (userType === "admin") {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view verification details",
        });
      }

      // Prepare response based on user type
      const response = {
        success: true,
        order: {
          id: order._id,
          status: order.status,
          orderNumber: `ORD-${order._id.toString().slice(-8).toUpperCase()}`,
          createdAt: order.createdAt,
        },
      };

      if (userType === "vendor") {
        response.verification = {
          pickupCode: order.verification.pickupCode,
          deliveryOTP: order.verification.deliveryOTP,
          qrGeneratedAt: order.verification.qrGeneratedAt,
          pickupVerified: !!order.verification.pickupVerifiedAt,
          pickupVerifiedAt: order.verification.pickupVerifiedAt,
          driver: order.driverId,
        };
      } else if (userType === "driver") {
        response.verification = {
          deliveryOTP:
            order.status === "READY_FOR_PICKUP"
              ? order.verification.deliveryOTP
              : null,
          pickupVerified: !!order.verification.pickupVerifiedAt,
          restaurant: order.restaurantId,
          customer: order.buyer,
        };
      }

      res.status(200).json(response);
    } catch (error) {
      console.error("Error getting verification details:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ✅ Manual verification (fallback when QR fails)
  static async manualVerification(req, res) {
    try {
      const { orderId } = req.params;
      const { driverId, orderNumber } = req.body;

      if (!driverId || !orderNumber) {
        return res.status(400).json({
          success: false,
          message: "Driver ID and order number are required",
        });
      }

      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Extract order number from format ORD-XXXXXX
      const extractedOrderNumber = orderNumber
        .replace("ORD-", "")
        .toUpperCase();
      const orderSuffix = order._id.toString().slice(-6).toUpperCase();

      if (extractedOrderNumber !== orderSuffix) {
        return res.status(400).json({
          success: false,
          message: "Order number does not match",
        });
      }

      // Check if driver is assigned
      if (order.driverId?.toString() !== driverId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this order",
        });
      }

      // Proceed with pickup verification using order ID as code
      const reqWithBody = {
        ...req,
        body: {
          ...req.body,
          verificationCode: order.verification.pickupCode,
          method: "MANUAL",
        },
      };

      return VerificationController.verifyPickup(reqWithBody, res);
    } catch (error) {
      console.error("Error in manual verification:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ✅ Refresh verification codes
  static async refreshVerificationCodes(req, res) {
    try {
      const { orderId } = req.params;
      const vendorId = req.userId;

      const order = await Order.findById(orderId).populate(
        "restaurantId",
        "vendorId",
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Check vendor authorization
      if (order.restaurantId.vendorId.toString() !== vendorId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }

      // Only refresh if order is still ready for pickup
      if (order.status !== "PICKED_UP") {
        return res.status(400).json({
          success: false,
          message: "Cannot refresh codes. Order status is not READY_FOR_PICKUP",
        });
      }

      // Generate new codes
      const shortId = order._id.toString().slice(-6).toUpperCase();
      const randomChars = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();

      order.verification.pickupCode = `PICKUP-${shortId}-${randomChars}`;
      order.verification.deliveryOTP = Math.floor(
        1000 + Math.random() * 9000,
      ).toString();
      order.verification.qrGeneratedAt = new Date();
      order.verification.verificationAttempts = 0;

      // Add to timeline
      if (!order.timeline) order.timeline = [];
      order.timeline.push({
        status: "VERIFICATION_REFRESHED",
        timestamp: new Date(),
        actor: "VENDOR",
        note: "Verification codes refreshed",
      });

      await order.save();

      res.status(200).json({
        success: true,
        message: "Verification codes refreshed successfully",
        verification: order.verification,
        qrGeneratedAt: order.verification.qrGeneratedAt,
      });
    } catch (error) {
      console.error("Error refreshing verification codes:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ✅ Update driver status (OUT_FOR_DELIVERY, ARRIVED, etc.)
  static async updateDriverStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { driverId, status, location } = req.body;

      if (!driverId || !status) {
        return res.status(400).json({
          success: false,
          message: "Driver ID and status are required",
        });
      }

      const order = await Order.findById(orderId)
        .populate("driverId", "vehicleNumber")
        .populate("restaurantId", "title vendorId");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Check if driver is assigned
      if (order.driverId?._id.toString() !== driverId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this order",
        });
      }

      // Validate status transition
      const validTransitions = {
        PICKED_UP: ["READY_FOR_PICKUP"],
        READY_FOR_PICKUP: ["ARRIVED_AT_CUSTOMER"],
        ARRIVED_AT_CUSTOMER: ["DELIVERED"],
      };

      const currentStatus = order.status;
      if (!validTransitions[currentStatus]?.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition from ${currentStatus} to ${status}`,
        });
      }

      // Update order status
      order.status = status;

      // Add to timeline
      if (!order.timeline) order.timeline = [];
      order.timeline.push({
        status: status,
        timestamp: new Date(),
        actor: "DRIVER",
        note: location
          ? `At location: ${location}`
          : `Status updated to ${status}`,
      });

      await order.save();

      // ✅ Emit real-time notifications
      try {
        const { emitToVendor, emitToOrder } = require("../config/socket");

        emitToVendor(order.restaurantId.vendorId, "driver-status-updated", {
          orderId: order._id,
          driverId,
          status,
          timestamp: new Date(),
        });

        emitToOrder(order._id, "status-updated", {
          status: status,
          message: `Driver is ${status.toLowerCase().replace(/_/g, " ")}`,
          timestamp: new Date(),
        });
      } catch (socketError) {
        console.log("Socket notification skipped:", socketError.message);
      }

      // Helper function inside the method
      const getNextStep = (status) => {
        const steps = {
          PICKED_UP: "Start delivery to customer",
          READY_FOR_PICKUP: "Arrive at customer location",
          ARRIVED_AT_CUSTOMER: "Enter OTP to complete delivery",
          DELIVERED: "Delivery completed",
        };
        return steps[status] || "Proceed to next step";
      };

      res.status(200).json({
        success: true,
        message: `Status updated to ${status}`,
        order: {
          id: order._id,
          status: order.status,
          nextStep: getNextStep(status),
        },
      });
    } catch (error) {
      console.error("Error updating driver status:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async completeDelivery(req, res) {
    try {
      const { orderId } = req.params;
      const { driverId } = req.body;

      const order = await Order.findById(orderId);

      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      // Check if driver is assigned
      if (order.driverId?.toString() !== driverId) {
        return res.status(403).json({
          success: false,
          message: "Not authorized",
        });
      }

      // Check if order is ARRIVED_AT_CUSTOMER
      if (order.status !== "ARRIVED_AT_CUSTOMER") {
        return res.status(400).json({
          success: false,
          message: `Order is ${order.status}, not ready for delivery completion`,
        });
      }

      // Mark as delivered
      order.status = "DELIVERED";
      order.actualDeliveryTime = new Date();

      if (!order.timeline) order.timeline = [];
      order.timeline.push({
        status: "DELIVERED",
        timestamp: new Date(),
        actor: "DRIVER",
        note: "Delivery completed",
      });

      await order.save();

      // Clear driver's current order
      await Driver.findByIdAndUpdate(driverId, {
        $unset: { currentOrder: "" },
        $inc: { totalDeliveries: 1 },
        lastActive: new Date(),
      });

      res.status(200).json({
        success: true,
        message: "Delivery completed successfully!",
      });
    } catch (error) {
      console.error("Error completing delivery:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = VerificationController;
