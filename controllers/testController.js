// controllers/testController.js
const orderModel = require("../models/orderModel");

const createTestOrder = async (req, res) => {
  try {
    // Hardcoded test data - Replace with your actual IDs
    const testOrder = {
      food: [
        {
          foodId: "6964b0da8bca87f68dd6eda2", // Replace with actual food ID
          quantity: 2,
        },
      ],
      payment: {
        method: "COD",
        amount: 598,
        transactionId: `TXN_TEST_${Date.now()}`,
      },
      buyer: "69637c0950e539c591f496c7", // Replace with customer user ID
      restaurantId: "6964b0da8bca87f68dd6eda1", // Replace with restaurant ID
      status: "PENDING",
      vendorStatus: "PENDING",
      estimatedPrepTime: 30,
    };

    const order = await orderModel.create(testOrder);

    res.status(201).send({
      status: true,
      message: "Test order created",
      order,
    });
  } catch (error) {
    console.log("Error creating test order", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = { createTestOrder };
