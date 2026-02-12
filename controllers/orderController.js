// const orderModel = require("../models/orderModel");

// const createOrder = async (req, res) => {
//   try {
//     const { food, payment, status, restaurantId } = req.body;

//     // ✅ VALIDATION
//     if (!food || !payment || !restaurantId) {
//       return res.status(400).send({
//         status: false,
//         message: "Food and payment and restaurantId required",
//       });
//     }
//     if (
//       !Array.isArray(food) ||
//       food.some((f) => !f.foodId || typeof f.quantity !== "number")
//     ) {
//       return res.status(400).send({
//         status: false,
//         message: "Invalid food: Need foodId & quantity (number)",
//       });
//     }

//     const order = await orderModel.create({
//       food,
//       payment,
//       restaurantId,
//       status: status || "PENDING", // ✅ Default
//       buyer: req.userId,
//     });

//     res.status(200).send({
//       status: true, // ✅ Fixed: staus → status
//       message: "order created successfully", // ✅ Fixed: mesage → message
//       order,
//     });
//   } catch (error) {
//     console.error("error", error);
//     res.status(500).send({
//       status: false,
//       message: "internal server error",
//     });
//   }
// };

// const changeStatus = async (req, res) => {
//   try {
//     const { id, status } = req.body;
//     if (!id || !status) {
//       return res.status(400).send({
//         status: false,
//         message: "invalid request data",
//       });
//     }
//     const existingOrder = await orderModel.findById(id);
//     if (!existingOrder) {
//       return res.status(404).send({
//         status: false,
//         message: "order not found",
//       });
//     }
//     Object.assign(existingOrder, { status: status });
//     console.log("existingOrder:", existingOrder, status);
//     const updatedOrder = await existingOrder.save();
//     res.status(200).send({
//       status: true,
//       message: "order status updated successfully",
//       updatedOrder,
//     });
//   } catch (error) {
//     console.error("error", error);
//     res.status(500).send({
//       status: false,
//       message: "internal server error",
//     });
//   }
// };

// const getAllOrders = async (req, res) => {
//   try {
//     const orders = await orderModel.find().populate("food.foodId");
//     if (!orders) {
//       return res.status(404).send({
//         status: false,
//         message: "no orders found",
//       });
//     }
//     res.status(200).send({
//       status: true,
//       message: "orders fetched successfully",
//       orders,
//     });
//   } catch (error) {
//     console.error("error", error);
//     res.status(500).send({
//       status: false,
//       message: "internal server error",
//     });
//   }
// };

// // Add this new controller function to your orderController.js file
// const clearOrderHistory = async (req, res) => {
//   try {
//     const { orderIds } = req.body;
//     const userId = req.userId; // Assuming you have userId from auth middleware

//     if (!userId) {
//       return res.status(401).send({
//         status: false,
//         message: "Authentication required",
//       });
//     }

//     // If specific order IDs are provided, delete only those
//     if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
//       // Verify each order belongs to the user before deleting
//       const ordersToDelete = await orderModel.find({
//         _id: { $in: orderIds },
//         buyer: userId,
//       });

//       if (ordersToDelete.length !== orderIds.length) {
//         return res.status(403).send({
//           status: false,
//           message: "Some orders don't belong to you or don't exist",
//         });
//       }

//       // Delete selected orders
//       await orderModel.deleteMany({
//         _id: { $in: orderIds },
//         buyer: userId,
//       });

//       return res.status(200).send({
//         status: true,
//         message: `${orderIds.length} orders deleted successfully`,
//         deletedCount: orderIds.length,
//       });
//     } else {
//       // Delete only completed (DELIVERED or CANCELLED) orders for this user
//       const result = await orderModel.deleteMany({
//         buyer: userId,
//       });

//       return res.status(200).send({
//         status: true,
//         message: `Cleared ${result.deletedCount} completed orders`,
//         deletedCount: result.deletedCount,
//       });
//     }
//   } catch (error) {
//     console.error("Clear history error:", error);
//     return res.status(500).send({
//       status: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// module.exports = {
//   createOrder,
//   changeStatus,
//   getAllOrders,
//   clearOrderHistory,
// };

const Order = require("../models/orderModel");
const OrderMoneyController = require("./orderMoneyController");

const createOrder = async (req, res) => {
  try {
    const {
      food,
      payment,
      status,
      restaurantId,
      deliveryFee = 0,
      tip = 0,
    } = req.body;

    // ✅ VALIDATION
    if (!food || !payment || !restaurantId) {
      return res.status(400).send({
        status: false,
        message: "Food and payment and restaurantId required",
      });
    }
    if (
      !Array.isArray(food) ||
      food.some((f) => !f.foodId || typeof f.quantity !== "number")
    ) {
      return res.status(400).send({
        status: false,
        message: "Invalid food: Need foodId & quantity (number)",
      });
    }

    const order = await Order.create({
      food,
      payment,
      restaurantId,
      deliveryFee,
      tip,
      status: status || "PENDING",
      buyer: req.userId,
    });

    res.status(200).send({
      status: true,
      message: "order created successfully",
      order,
    });
  } catch (error) {
    console.error("error", error);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

const changeStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) {
      return res.status(400).send({
        status: false,
        message: "invalid request data",
      });
    }

    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      return res.status(404).send({
        status: false,
        message: "order not found",
      });
    }

    // Use the integrated method for status change
    const result = await OrderMoneyController.updateOrderStatusWithPayout(
      id,
      status,
      "USER",
    );

    res.status(200).send({
      status: true,
      message: "order status updated successfully",
      updatedOrder: result.order,
      payoutTriggered: result.payoutTriggered,
      note: result.payoutTriggered
        ? "Money distribution triggered (24-hour hold)"
        : "",
    });
  } catch (error) {
    console.error("error", error);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("food.foodId");
    if (!orders) {
      return res.status(404).send({
        status: false,
        message: "no orders found",
      });
    }
    res.status(200).send({
      status: true,
      message: "orders fetched successfully",
      orders,
    });
  } catch (error) {
    console.error("error", error);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};
const getUserOrders = async (req, res) => {
  try {
    const userId = req.userId; // ← GET FROM AUTH MIDDLEWARE
    const orders = await Order.find({ buyer: userId }) // ← FILTER BY USER
      .populate("food.foodId")
      .sort({ createdAt: -1 });
    res.status(200).send({
      status: true,
      orders,
    });
  } catch (error) {
    console.error("error", error);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};
const clearOrderHistory = async (req, res) => {
  try {
    const { orderIds } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).send({
        status: false,
        message: "Authentication required",
      });
    }

    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      const ordersToDelete = await Order.find({
        _id: { $in: orderIds },
        buyer: userId,
      });

      if (ordersToDelete.length !== orderIds.length) {
        return res.status(403).send({
          status: false,
          message: "Some orders don't belong to you or don't exist",
        });
      }

      await Order.deleteMany({
        _id: { $in: orderIds },
        buyer: userId,
      });

      return res.status(200).send({
        status: true,
        message: `${orderIds.length} orders deleted successfully`,
        deletedCount: orderIds.length,
      });
    } else {
      const result = await Order.deleteMany({
        buyer: userId,
      });

      return res.status(200).send({
        status: true,
        message: `Cleared ${result.deletedCount} completed orders`,
        deletedCount: result.deletedCount,
      });
    }
  } catch (error) {
    console.error("Clear history error:", error);
    return res.status(500).send({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ✅ NEW: Get order payout details
const getOrderPayoutDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const details = await OrderMoneyController.getOrderPayoutDetails(orderId);

    res.status(200).send({
      status: true,
      ...details,
    });
  } catch (error) {
    console.error("Get payout details error:", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createOrder,
  changeStatus,
  getAllOrders,
  clearOrderHistory,
  getOrderPayoutDetails, // ✅ NEW
  getUserOrders,
};
