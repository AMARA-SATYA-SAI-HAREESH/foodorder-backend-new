const Driver = require("../models/Driver");
const Order = require("../models/orderModel");
const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
// const DriverEarning = require("../models/DriverEarning");
const Withdrawal = require("../models/VendorWithdrawal");
const mongoose = require("mongoose");
// const { updateVendorBalanceOnDelivery } = require("./vendorEarningsController");

// 1. Get Driver Profile
exports.getDriverProfile = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const driver = await Driver.findById(driverId).populate(
      "user",
      "userName email phone",
    );

    res.json({
      success: true,
      driver,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 2. Update Location
exports.updateLocation = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { lat, lng, address } = req.body;

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      {
        "currentLocation.lat": lat,
        "currentLocation.lng": lng,
        "currentLocation.address": address,
        "currentLocation.lastUpdated": new Date(),
        lastActive: new Date(),
      },
      { new: true },
    );

    res.json({
      success: true,
      message: "Location updated",
      location: driver.currentLocation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 3. Toggle Online Status
exports.toggleOnlineStatus = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { isOnline } = req.body;

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      {
        isOnline,
        isAvailable: isOnline,
        lastActive: new Date(),
      },
      { new: true },
    );

    res.json({
      success: true,
      message: isOnline ? "You are now online" : "You are now offline",
      isOnline: driver.isOnline,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 4. Get Available Orders
exports.getAvailableOrders = async (req, res) => {
  try {
    console.log("🚗 [DEBUG] ========== getAvailableOrders START ==========");
    const driverId = req.driver._id;
    const driver = await Driver.findById(driverId);
    console.log("👤 Driver ID:", driverId);
    console.log("📊 Driver Status:", {
      isOnline: driver.isOnline,
      isAvailable: driver.isAvailable,
      email: driver.email,
      vehicleNumber: driver.vehicleNumber,
    });

    if (!driver.isOnline || !driver.isAvailable) {
      return res.status(200).json({
        success: true,
        count: 0,
        orders: [],
        message: "Driver is offline or unavailable",
      });
    }

    console.log("🔍 Querying orders with:");
    console.log("   - status: READY_FOR_PICKUP");
    console.log("   - driverId: null");

    const availableOrders = await Order.find({
      status: "READY_FOR_PICKUP",
      driverId: null,
      vendorStatus: "READY",
    })
      .populate("restaurantId", "name address")
      .populate("buyer", "userName phone")
      .populate("food.foodId", "name price")
      .limit(10)
      .sort({ createdAt: -1 });
    console.log("📦 Recent orders in DB:");

    res.json({
      success: true,
      count: availableOrders.length,
      orders: availableOrders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 5. Accept Order
// exports.acceptOrder = async (req, res) => {
//   try {
//     // const { id: orderId } = req.query; // Get from query params
//     const { orderId } = req.body;
//     const driverId = req.driver._id;

//     if (!orderId) {
//       return res.status(400).json({
//         success: false,
//         message: "Order ID is required as query parameter: ?id=ORDER_ID",
//       });
//     }

//     // Find the order
//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: "Order not found",
//       });
//     }

//     // Check if order is available
//     if (order.status !== "READY_FOR_PICKUP") {
//       return res.status(400).json({
//         success: false,
//         message: "Order is not available for acceptance",
//       });
//     }

//     // Check if driver is available
//     const driver = await Driver.findById(driverId);
//     // if (!driver.isAvailable || driver.currentOrder) {
//     //   return res.status(400).json({
//     //     success: false,
//     //     message: "Driver is not available",
//     //   });
//     // }

//     // Check if driver is online
//     // const driver = await Driver.findById(driverId);
//     if (!driver.isOnline) {
//       return res.status(400).json({
//         success: false,
//         message: "Driver must be online to accept orders",
//       });
//     }

//     // Check if driver has an ACTIVE order (not just any order)
//     if (driver.currentOrder) {
//       const activeOrder = await Order.findById(driver.currentOrder);

//       // If order is still active (not delivered/cancelled), block
//       if (
//         activeOrder &&
//         activeOrder.status !== "DELIVERED" &&
//         activeOrder.status !== "CANCELLED"
//       ) {
//         return res.status(400).json({
//           success: false,
//           message: "You already have an active order. Complete it first.",
//         });
//       }

//       // If order is completed/cancelled, clear it automatically
//       if (activeOrder) {
//         console.log(
//           `🧹 Auto-cleaning stuck order ${driver.currentOrder} for driver ${driverId}`,
//         );
//         driver.currentOrder = null;
//         await driver.save();
//       }
//     }

//     // Update order
//     order.driverId = driverId;
//     order.status = "ACCEPTED";
//     order.driverAssignedAt = new Date();
//     await order.save();

//     // Update driver
//     driver.currentOrder = orderId;
//     await driver.save();

//     res.json({
//       success: true,
//       message: "Order accepted successfully",
//       order: {
//         id: order._id,
//         orderNumber: order.orderNumber,
//         restaurant: order.restaurantId,
//         deliveryAddress: order.deliveryAddress,
//         status: order.status,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// 5. Accept Order - FIXED VERSION
exports.acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const driverId = req.driver._id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order is available
    if (order.status !== "READY_FOR_PICKUP") {
      return res.status(400).json({
        success: false,
        message: "Order is not available for acceptance",
      });
    }

    // Check if order already has a driver
    if (order.driverId) {
      return res.status(400).json({
        success: false,
        message: "Order already assigned to another driver",
      });
    }

    // Get driver - SINGLE DECLARATION
    const driver = await Driver.findById(driverId);

    // Check if driver is online
    if (!driver.isOnline) {
      return res.status(400).json({
        success: false,
        message: "Driver must be online to accept orders",
      });
    }

    // Check if driver has an ACTIVE order
    if (driver.currentOrder) {
      const activeOrder = await Order.findById(driver.currentOrder);

      if (
        activeOrder &&
        activeOrder.status !== "DELIVERED" &&
        activeOrder.status !== "CANCELLED"
      ) {
        return res.status(400).json({
          success: false,
          message: "You already have an active order. Complete it first.",
        });
      }

      // Auto-cleanup completed/cancelled orders
      // Auto-cleanup completed/cancelled orders
      if (activeOrder) {
        // Order exists - check if it's completed
        if (
          activeOrder.status === "DELIVERED" ||
          activeOrder.status === "CANCELLED"
        ) {
          console.log(
            `🧹 Auto-cleaning completed order ${driver.currentOrder} for driver ${driverId}`,
          );
          driver.currentOrder = null;
          await driver.save();
        }
      } else {
        // ✅ FIX: Order doesn't exist in database anymore!
        console.log(
          `🧹 Auto-cleaning NON-EXISTENT order ${driver.currentOrder} for driver ${driverId}`,
        );
        driver.currentOrder = null;
        await driver.save();
      }
    }

    // Update order
    order.driverId = driverId;
    order.status = "ACCEPTED";
    order.driverAssignedAt = new Date();
    order.driverStatus = "ASSIGNED";
    await order.save();

    // Update driver
    driver.currentOrder = orderId;
    await driver.save();

    res.json({
      success: true,
      message: "Order accepted successfully",
      order: {
        id: order._id,
        status: order.status,
        restaurant: order.restaurantId,
      },
    });
  } catch (error) {
    console.error("❌ Accept order error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.updateOrderStatus = async (req, res) => {
  try {
    console.log("🚗 [UPDATE STATUS] ========== START ==========");
    console.log("📦 FULL REQUEST:", {
      method: req.method,
      url: req.url,
      query: req.query,
      body: req.body,
      driver: req.driver ? { id: req.driver._id } : "No driver",
    });

    // const { id: orderId } = req.query;
    const orderId = req.body.id || req.query.id;
    const { status } = req.body;
    const driverId = req.driver?._id;

    console.log("🔍 Parsed parameters:", { orderId, status, driverId });

    if (!orderId) {
      console.error("❌ Missing order ID");
      return res.status(400).json({
        success: false,
        message: "Order ID is required as query parameter: ?id=ORDER_ID",
      });
    }

    if (!status) {
      console.error("❌ Missing status");
      return res.status(400).json({
        success: false,
        message: "Status is required in request body",
      });
    }

    // Check if ObjectId is valid
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      console.error("❌ Invalid order ID format:", orderId);
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    // Find the order
    console.log("🔍 Looking for order:", orderId);
    const order = await Order.findById(orderId);

    console.log("📊 Order lookup result:", {
      found: !!order,
      order: order
        ? {
            id: order._id,
            status: order.status,
            driverId: order.driverId,
            restaurantId: order.restaurantId,
          }
        : null,
    });

    if (!order) {
      console.error("❌ Order not found");
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if driver owns this order
    const orderDriverId = order.driverId?.toString();
    const currentDriverId = driverId?.toString();

    console.log("👤 Driver check:", {
      orderDriverId,
      currentDriverId,
      match: orderDriverId === currentDriverId,
      hasDriverId: !!order.driverId,
    });

    if (!order.driverId || orderDriverId !== currentDriverId) {
      console.error("❌ Driver not authorized for this order");
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this order",
      });
    }

    console.log(
      "✅ All checks passed, updating status from",
      order.status,
      "to",
      status,
    );

    // Update order
    const oldStatus = order.status;
    order.status = status;

    // Handle status-specific updates
    // Handle status-specific updates
    //   if (status === "PICKED_UP") {
    //     order.pickedUpAt = new Date();
    //     order.driverStatus = "PICKED_UP";
    //     console.log("✅ Set pickedUpAt and driverStatus");
    //   } else if (status === "ON_THE_WAY") {
    //     order.driverStatus = "EN_ROUTE";
    //     console.log("✅ Set driverStatus to EN_ROUTE");
    //   } else if (status === "ARRIVED_AT_CUSTOMER") {
    //     order.driverStatus = "ARRIVED_AT_CUSTOMER";
    //     console.log("✅ Set driverStatus to ARRIVED_AT_CUSTOMER");
    //     // } else if (status === "DELIVERED") {
    //     //   order.deliveredAt = new Date();
    //     //   order.driverStatus = "DELIVERED";
    //     //   console.log("✅ Set deliveredAt and driverStatus");

    //     //   // Clear driver's current order
    //     //   await Driver.findByIdAndUpdate(driverId, {
    //     //     $unset: { currentOrder: "" },
    //     //   });
    //     //   console.log("✅ Cleared driver's currentOrder");
    //   } else if (status === "CANCELLED") {
    //     order.cancelledAt = new Date();
    //     order.cancelledBy = "DRIVER";
    //     order.driverStatus = "CANCELLED";
    //     console.log("✅ Set cancelledAt and driverStatus");

    //     // Clear driver's current order
    //     await Driver.findByIdAndUpdate(driverId, {
    //       $unset: { currentOrder: "" },
    //     });
    //     console.log("✅ Cleared driver's currentOrder");
    //     // }
    //   } else if (status === "DELIVERED") {
    //     order.deliveredAt = new Date();
    //     order.driverStatus = "DELIVERED";
    //     console.log("✅ Set deliveredAt and driverStatus");

    //     // Clear driver's current order
    //     await Driver.findByIdAndUpdate(driverId, {
    //       $unset: { currentOrder: "" },
    //     });
    //     console.log("✅ Cleared driver's currentOrder");

    //     // ✅ CRITICAL: Update vendor balance when order is delivered
    //     // try {
    //     //   console.log(
    //     //     "💰 Calling updateVendorBalanceOnDelivery for order:",
    //     //     orderId,
    //     //   );
    //     //   await updateVendorBalanceOnDelivery(orderId);
    //     //   console.log("✅ Vendor balance updated for delivered order");
    //     // } catch (error) {
    //     //   console.error("❌ Error updating vendor balance:", error);
    //     //   // Don't fail the whole operation, just log the error
    //     // }

    //     // ✅ KEPT - Driver status updates
    //     order.actualDeliveryTime = new Date();
    //     order.driverStatus = "DELIVERED";

    //     // ✅ KEPT - Clear driver's current order
    //     await Driver.findByIdAndUpdate(driverId, {
    //       $unset: { currentOrder: "" },
    //     });

    //     // ✅ ADDED - Clear log that auto-payout will handle it
    //     console.log(
    //       `📦 Order ${orderId} delivered - auto-payout system will handle money distribution`,
    //     );
    //   }
    //   // Save the order
    //   console.log("💾 Saving order...");
    //   await order.save();
    //   console.log("✅ Order saved successfully");

    //   res.json({
    //     success: true,
    //     message: `Order status updated from ${oldStatus} to ${status}`,
    //     order: {
    //       id: order._id,
    //       status: order.status,
    //       driverStatus: order.driverStatus,
    //       updatedAt: order.updatedAt,
    //     },
    //   });

    //   console.log("🚗 [UPDATE STATUS] ========== END ==========");
    // } catch (error) {
    //   console.error("❌ [UPDATE STATUS] UNEXPECTED ERROR:", {
    //     message: error.message,
    //     stack: error.stack,
    //     name: error.name,
    //     code: error.code,
    //   });

    // Handle status-specific updates
    if (status === "PICKED_UP") {
      order.pickedUpAt = new Date();
      order.driverStatus = "PICKED_UP";
      console.log("✅ Set pickedUpAt and driverStatus");
    } else if (status === "ON_THE_WAY") {
      order.driverStatus = "EN_ROUTE";
      console.log("✅ Set driverStatus to EN_ROUTE");
    } else if (status === "ARRIVED_AT_CUSTOMER") {
      order.driverStatus = "ARRIVED_AT_CUSTOMER";
      console.log("✅ Set driverStatus to ARRIVED_AT_CUSTOMER");
    } else if (status === "CANCELLED") {
      order.cancelledAt = new Date();
      order.cancelledBy = "DRIVER";
      order.driverStatus = "CANCELLED";
      console.log("✅ Set cancelledAt and driverStatus");

      // Clear driver's current order and make available
      await Driver.findByIdAndUpdate(driverId, {
        $unset: { currentOrder: "" },
        isAvailable: true,
      });
      console.log("✅ Cleared driver's currentOrder and set driver available");
    } else if (status === "DELIVERED") {
      // Set delivery time and status
      order.actualDeliveryTime = new Date();
      order.driverStatus = "DELIVERED";
      console.log("✅ Set actualDeliveryTime and driverStatus to DELIVERED");

      // Clear driver's current order and make available
      await Driver.findByIdAndUpdate(driverId, {
        $unset: { currentOrder: "" },
        isAvailable: true,
      });
      console.log("✅ Cleared driver's currentOrder and set driver available");

      // Log for auto-payout system
      console.log(
        `📦 Order ${orderId} delivered - auto-payout system will handle money distribution`,
      );
    }

    // Save the order
    console.log("💾 Saving order...");
    await order.save();
    console.log("✅ Order saved successfully");

    res.json({
      success: true,
      message: `Order status updated from ${oldStatus} to ${status}`,
      order: {
        id: order._id,
        status: order.status,
        driverStatus: order.driverStatus,
        updatedAt: order.updatedAt,
      },
    });

    console.log("🚗 [UPDATE STATUS] ========== END ==========");
  } catch (error) {
    console.error("❌ [UPDATE STATUS] UNEXPECTED ERROR:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });
    // Check for specific MongoDB errors
    if (error.name === "CastError") {
      console.error("❌ Mongoose CastError - Invalid ID format");
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
// 7. Get Current Order
exports.getCurrentOrder = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const driver = await Driver.findById(driverId);

    if (!driver.currentOrder) {
      return res.json({
        success: true,
        message: "No current order",
        order: null,
      });
    }

    const order = await Order.findById(driver.currentOrder)
      .populate("restaurantId", "name address")
      .populate("buyer", "userName phone address");

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Drivers (ADMIN ONLY)
exports.getAllDrivers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      isOnline,
      verificationStatus,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter
    const filter = {};

    if (isOnline !== undefined) filter.isOnline = isOnline === "true";
    if (verificationStatus) filter.verificationStatus = verificationStatus;

    // Search filter
    if (search) {
      filter.$or = [
        { vehicleNumber: { $regex: search, $options: "i" } },
        { licenseNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Execute query with user info
    const drivers = await Driver.find(filter)
      .populate("user", "userName email phone isActive")
      .select("-__v")
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Driver.countDocuments(filter);

    res.json({
      success: true,
      drivers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Driver Account (ADMIN ONLY)
exports.deleteDriverAccount = async (req, res) => {
  try {
    // const { driverId } = req.params;
    const { id: driverId } = req.query;

    const { deleteType = "soft", reason } = req.body;

    const driver = await Driver.findById(driverId).populate("user");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    if (deleteType === "hard") {
      // Hard delete
      await User.findByIdAndDelete(driver.user._id);
      await Driver.findByIdAndDelete(driverId);

      res.json({
        success: true,
        message: "Driver account permanently deleted",
      });
    } else {
      // Soft delete
      await User.findByIdAndUpdate(driver.user._id, {
        isActive: false,
        deletedAt: new Date(),
        deletionReason: reason,
      });

      await Driver.findByIdAndUpdate(driverId, {
        isOnline: false,
        isAvailable: false,
        isActive: false,
        deletedAt: new Date(),
        deletionReason: reason,
      });

      res.json({
        success: true,
        message: "Driver account deactivated",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Self-delete route - PERMANENT DELETION (DRIVER ONLY)
exports.deleteMyAccount = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { password, confirmPassword } = req.body;

    // Validation
    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirmation are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Get driver and user
    const driver = await Driver.findById(driverId).populate("user");
    if (!driver || !driver.user) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    const user = await User.findById(driver.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    // Check if driver has pending withdrawals
    const pendingWithdrawals = await Withdrawal.find({
      driver: driverId,
      status: { $in: ["PENDING", "PROCESSING"] },
    });

    if (pendingWithdrawals.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete account with pending withdrawals. Please wait for withdrawals to complete or cancel them first.",
        pendingWithdrawals: pendingWithdrawals.length,
      });
    }

    // Check if driver has active orders
    const activeOrders = await Order.find({
      driverId: driverId,
      status: { $nin: ["DELIVERED", "CANCELLED"] },
    });

    if (activeOrders.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete account with active orders. Please complete or cancel your current orders first.",
        activeOrders: activeOrders.map((order) => ({
          id: order._id,
          status: order.status,
        })),
      });
    }

    // Start deletion process
    console.log(
      `Starting permanent deletion for driver: ${driverId}, user: ${user._id}`,
    );

    // 1. Release any assigned orders (just in case)
    await Order.updateMany(
      { driverId: driverId },
      {
        driverId: null,
        status: "READY_FOR_PICKUP",
      },
    );

    // 2. Delete driver earnings records
    await DriverEarning.deleteMany({ driver: driverId });

    // 3. Delete withdrawal records
    await Withdrawal.deleteMany({ driver: driverId });

    // 4. Delete driver document
    await Driver.findByIdAndDelete(driverId);

    // 5. Delete user document
    await User.findByIdAndDelete(user._id);

    // 6. Clear tokens from response
    res.clearCookie("token");

    console.log(`Successfully deleted driver account: ${driverId}`);

    res.json({
      success: true,
      message:
        "Account permanently deleted successfully. All your data has been removed from our system.",
      timestamp: new Date().toISOString(),
      deleted: {
        driver: driverId,
        user: user._id,
        earnings: true,
        withdrawals: true,
        ordersReleased: true,
      },
    });
  } catch (error) {
    console.error("Error during account deletion:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete account. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.updateDriverVerification = async (req, res) => {
  try {
    // const { driverId } = req.params;
    const { id: driverId } = req.query;
    const { verificationStatus } = req.body;

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      {
        verificationStatus,
        isVerified: verificationStatus === "APPROVED",
      },
      { new: true },
    );

    res.json({
      success: true,
      message: `Driver verification status updated to ${verificationStatus}`,
      driver,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
