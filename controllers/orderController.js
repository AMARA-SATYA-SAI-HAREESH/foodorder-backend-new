const orderModel = require("../models/orderModel");
// const createOrder = async (req, res) => {
//   try {
//     const { food, payment, status } = req.body;
//     if (!food || !payment) {
//       return res.status(400).send({
//         status: false,
//         message: "invalid request data",
//       });
//     }
//     const order = await orderModel.create({
//       food,
//       payment,
//       status,
//       buyer: req.userId,
//     });
//     res.status(200).send({
//       staus: true,
//       mesage: "order created successfully",
//       order,
//     });}
const createOrder = async (req, res) => {
  try {
    const { food, payment, status } = req.body;

    // ✅ VALIDATION
    if (!food || !payment) {
      return res.status(400).send({
        status: false,
        message: "Food and payment required",
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

    const order = await orderModel.create({
      food,
      payment,
      status: status || "PENDING", // ✅ Default
      buyer: req.userId,
    });

    res.status(200).send({
      status: true, // ✅ Fixed: staus → status
      message: "order created successfully", // ✅ Fixed: mesage → message
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
    const existingOrder = await orderModel.findById(id);
    if (!existingOrder) {
      return res.status(404).send({
        status: false,
        message: "order not found",
      });
    }
    Object.assign(existingOrder, { status: status });
    console.log("existingOrder:", existingOrder, status);
    const updatedOrder = await existingOrder.save();
    res.status(200).send({
      status: true,
      message: "order status updated successfully",
      updatedOrder,
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
    const orders = await orderModel.find().populate("food.foodId");
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

module.exports = {
  createOrder,
  changeStatus,
  getAllOrders,
};
