// controllers/vendorOrderController.js
const orderModel = require("../models/orderModel");
const restaurantModel = require("../models/restaurantModel");
const foodModel = require("../models/foodModel");

// Get All Orders for Vendor's Restaurant
const getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.userId;
    const { status, page = 1, limit = 10 } = req.query;

    // Find vendor's restaurant
    const restaurant = await restaurantModel.findOne({ vendorId });
    if (!restaurant) {
      return res.status(404).send({
        status: false,
        message: "Restaurant not found",
      });
    }

    // Build query
    const query = { restaurantId: restaurant._id };
    if (status) {
      query.status = status;
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Get orders with populated data
    const orders = await orderModel
      .find(query)
      // .populate("buyer", "userName email phone address")
      .populate({
        path: "buyer",
        select: "userName email phone address",
        model: "Users", // ← Singular 'User'
      })
      .populate("food.foodId", "title price imageUrl")
      .select("+verification")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalOrders = await orderModel.countDocuments(query);

    res.status(200).send({
      status: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit),
      },
    });
  } catch (error) {
    console.log("Error getting vendor orders", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

// Get Order Details
const getVendorOrderDetails = async (req, res) => {
  try {
    const vendorId = req.userId;
    const orderId = req.params.id;

    if (!orderId) {
      return res.status(400).send({
        status: false,
        message: "Order ID is required",
      });
    }

    // Find vendor's restaurant
    const restaurant = await restaurantModel.findOne({ vendorId });
    if (!restaurant) {
      return res.status(404).send({
        status: false,
        message: "Restaurant not found",
      });
    }

    // Find order
    const order = await orderModel
      .findOne({
        _id: orderId,
        restaurantId: restaurant._id,
      })
      .populate("buyer", "userName email phone address")
      .populate("food.foodId", "title price imageUrl description")
      .populate("driverId", "userName phone");

    if (!order) {
      return res.status(404).send({
        status: false,
        message: "Order not found",
      });
    }

    res.status(200).send({
      status: true,
      order,
    });
  } catch (error) {
    console.log("Error getting order details", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

// Update Order Status (Vendor-specific) - FIXED VERSION
const updateOrderStatus = async (req, res) => {
  try {
    console.log("📦 [VENDOR] ========== STATUS UPDATE START ==========");
    console.log("📦 Request body:", req.body);
    
    const vendorId = req.userId;
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      console.error("❌ Missing orderId or status");
      return res.status(400).send({
        status: false,
        message: "Order ID and status are required",
      });
    }

    // Find vendor's restaurant
    const restaurant = await restaurantModel.findOne({ vendorId });
    if (!restaurant) {
      console.error("❌ Restaurant not found for vendor:", vendorId);
      return res.status(404).send({
        status: false,
        message: "Restaurant not found",
      });
    }

    console.log("🏪 Restaurant found:", restaurant._id);

    // Find order WITH verification fields
    const order = await orderModel.findOne({
      _id: orderId,
      restaurantId: restaurant._id,
    });

    if (!order) {
      console.error("❌ Order not found:", orderId);
      return res.status(404).send({
        status: false,
        message: "Order not found",
      });
    }

    console.log("📦 Order found:", {
      id: order._id,
      currentStatus: order.status,
      vendorStatus: order.vendorStatus,
      hasVerification: !!order.verification,
      pickupCode: order.verification?.pickupCode,
      deliveryOTP: order.verification?.deliveryOTP
    });

    // Store old status for comparison
    const oldStatus = order.status;
    
    // ✅ HANDLE "READY" STATUS (READY_FOR_PICKUP)
    if (status === "READY" || status === "READY_FOR_PICKUP") {
      console.log("🔄 Processing READY status...");
      
      // Update order status
      order.status = "READY_FOR_PICKUP";
      order.vendorStatus = "READY";
      order.driverId = null;
      order.driverStatus = "AVAILABLE";
      
      // Ensure verification object exists
      if (!order.verification) {
        order.verification = {};
      }
      
      // Generate verification codes if they don't exist
      if (!order.verification.pickupCode) {
        const shortId = order._id.toString().slice(-6).toUpperCase();
        const randomChars = Math.random()
          .toString(36)
          .substring(2, 6)
          .toUpperCase();
        
        order.verification.pickupCode = `PICKUP-${shortId}-${randomChars}`;
        order.verification.deliveryOTP = Math.floor(
          1000 + Math.random() * 9000
        ).toString();
        order.verification.qrGeneratedAt = new Date();
        order.verification.verificationAttempts = 0;
        
        console.log("✅ Generated new verification codes:", {
          pickupCode: order.verification.pickupCode,
          deliveryOTP: order.verification.deliveryOTP
        });
      } else {
        console.log("ℹ️ Using existing verification codes:", {
          pickupCode: order.verification.pickupCode,
          deliveryOTP: order.verification.deliveryOTP
        });
      }
      
      // Set estimated pickup time (30 minutes from now)
      order.estimatedPickupTime = new Date(Date.now() + 30 * 60000);
      
      console.log("✅ Order marked as READY_FOR_PICKUP:", {
        orderId: order._id,
        newStatus: order.status,
        vendorStatus: order.vendorStatus,
        pickupCode: order.verification.pickupCode,
        deliveryOTP: order.verification.deliveryOTP
      });
      
    } 
    // ✅ HANDLE OTHER STATUSES
    else {
      order.status = status;
      
      if (status === "PREPARING") {
        order.estimatedPrepTime = 30; // Default 30 minutes
        console.log("⏳ Order marked as PREPARING");
      }
      
      console.log("🔄 Status changed from", oldStatus, "to", status);
    }
    
    // ✅ Add to timeline if status changed
    if (oldStatus !== order.status) {
      if (!order.timeline) {
        order.timeline = [];
      }
      order.timeline.push({
        status: order.status,
        timestamp: new Date(),
        actor: "VENDOR",
        note: `Status changed from ${oldStatus} to ${order.status}`,
      });
    }

    // Save the order
    console.log("💾 Saving order...");
    await order.save();
    console.log("✅ Order saved successfully");

    // Fetch the updated order with verification codes
    const updatedOrder = await orderModel.findById(orderId).select("+verification");
    
    console.log("📦 [VENDOR] Final order state:", {
      id: updatedOrder._id,
      status: updatedOrder.status,
      vendorStatus: updatedOrder.vendorStatus,
      verification: updatedOrder.verification,
      driverId: updatedOrder.driverId
    });

    res.status(200).send({
      status: true,
      message: `Order status updated from ${oldStatus} to ${order.status}`,
      order: updatedOrder,
      verification: updatedOrder.verification, // Include verification in response
    });
    
    console.log("📦 [VENDOR] ========== STATUS UPDATE END ==========");
  } catch (error) {
    console.error("❌ [VENDOR] Error updating order status:", {
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    res.status(500).send({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
// Accept/Reject Order
const acceptRejectOrder = async (req, res) => {
  try {
    const vendorId = req.userId;
    const { orderId, action } = req.body; // action: "accept" or "reject"

    if (!orderId || !action) {
      return res.status(400).send({
        status: false,
        message: "Order ID and action are required",
      });
    }

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).send({
        status: false,
        message: "Action must be 'accept' or 'reject'",
      });
    }

    // Find vendor's restaurant
    const restaurant = await restaurantModel.findOne({ vendorId });
    if (!restaurant) {
      return res.status(404).send({
        status: false,
        message: "Restaurant not found",
      });
    }

    // Find order
    const order = await orderModel.findOne({
      _id: orderId,
      restaurantId: restaurant._id,
    });

    if (!order) {
      return res.status(404).send({
        status: false,
        message: "Order not found",
      });
    }

    if (order.status !== "PENDING") {
      return res.status(400).send({
        status: false,
        message: `Order is already ${order.status}`,
      });
    }

    // Update based on action
    if (action === "accept") {
      order.status = "CONFIRMED";
      order.vendorStatus = "ACCEPTED";
    } else {
      order.status = "CANCELLED";
      order.vendorStatus = "REJECTED";
    }

    await order.save();

    res.status(200).send({
      status: true,
      message: `Order ${
        action === "accept" ? "accepted" : "rejected"
      } successfully`,
      order,
    });
  } catch (error) {
    console.log("Error accepting/rejecting order", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

// Get Today's Orders
const getTodaysOrders = async (req, res) => {
  try {
    const vendorId = req.userId;

    // Find vendor's restaurant
    const restaurant = await restaurantModel.findOne({ vendorId });
    if (!restaurant) {
      return res.status(404).send({
        status: false,
        message: "Restaurant not found",
      });
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's orders
    const orders = await orderModel
      .find({
        restaurantId: restaurant._id,
        createdAt: { $gte: today, $lt: tomorrow },
      })
      .populate("buyer", "userName")
      .populate("food.foodId", "title")
      .sort({ createdAt: -1 });

    // Calculate stats
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) =>
      ["PENDING", "CONFIRMED", "PREPARING"].includes(o.status)
    ).length;
    const deliveredOrders = orders.filter(
      (o) => o.status === "DELIVERED"
    ).length;

    // Calculate total revenue
    const revenueResult = await orderModel.aggregate([
      {
        $match: {
          restaurantId: restaurant._id,
          createdAt: { $gte: today, $lt: tomorrow },
          status: "DELIVERED",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$payment.amount" },
        },
      },
    ]);

    const todaysRevenue =
      revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    res.status(200).send({
      status: true,
      orders,
      stats: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        todaysRevenue,
      },
    });
  } catch (error) {
    console.log("Error getting today's orders", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

// Get Order Statistics
const getOrderStats = async (req, res) => {
  try {
    const vendorId = req.userId;

    // Find vendor's restaurant
    const restaurant = await restaurantModel.findOne({ vendorId });
    if (!restaurant) {
      return res.status(404).send({
        status: false,
        message: "Restaurant not found",
      });
    }

    // Get counts for each status
    const statusCounts = await orderModel.aggregate([
      {
        $match: { restaurantId: restaurant._id },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get weekly order data (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyOrders = await orderModel.aggregate([
      {
        $match: {
          restaurantId: restaurant._id,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
          revenue: { $sum: "$payment.amount" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get top selling foods
    const topFoods = await orderModel.aggregate([
      {
        $match: { restaurantId: restaurant._id },
      },
      { $unwind: "$food" },
      {
        $group: {
          _id: "$food.foodId",
          totalQuantity: { $sum: "$food.quantity" },
          totalOrders: { $sum: 1 },
        },
      },
      {
        $sort: { totalQuantity: -1 },
      },
      { $limit: 10 },
      {
        $lookup: {
          from: "foods",
          localField: "_id",
          foreignField: "_id",
          as: "foodDetails",
        },
      },
      { $unwind: "$foodDetails" },
    ]);

    res.status(200).send({
      status: true,
      stats: {
        statusCounts,
        weeklyOrders,
        topFoods,
      },
    });
  } catch (error) {
    console.log("Error getting order stats", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getVendorOrders,
  getVendorOrderDetails,
  updateOrderStatus,
  acceptRejectOrder,
  getTodaysOrders,
  getOrderStats,
};
