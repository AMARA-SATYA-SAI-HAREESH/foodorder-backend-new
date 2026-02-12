// controllers/vendorRestaurantController.js
const restaurantModel = require("../models/restaurantModel");

// Update Restaurant Details
const updateRestaurantDetails = async (req, res) => {
  try {
    const vendorId = req.userId;
    const { title, imageUrl, logoUrl, time, pickUp, delivery, isOpen, coords } =
      req.body;

    // Find vendor's restaurant
    const restaurant = await restaurantModel.findOne({ vendorId });
    if (!restaurant) {
      return res.status(404).send({
        status: false,
        message: "Restaurant not found",
      });
    }

    // Update fields
    if (title) restaurant.title = title;
    if (imageUrl) restaurant.imageUrl = imageUrl;
    if (logoUrl) restaurant.logoUrl = logoUrl;
    if (time) restaurant.time = time;
    if (pickUp !== undefined) restaurant.pickUp = pickUp;
    if (delivery !== undefined) restaurant.delivery = delivery;
    if (isOpen !== undefined) restaurant.isOpen = isOpen;
    if (coords) restaurant.coords = coords;
    restaurant.isVerified = true; // ← ADD THIS

    await restaurant.save();

    await restaurant.save();

    res.status(200).send({
      status: true,
      message: "Restaurant details updated successfully",
      restaurant,
    });
  } catch (error) {
    console.log("Error updating restaurant details", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

// Get Restaurant Stats
const getRestaurantStats = async (req, res) => {
  try {
    const vendorId = req.userId;

    const restaurant = await restaurantModel.findOne({ vendorId });
    if (!restaurant) {
      return res.status(404).send({
        status: false,
        message: "Restaurant not found",
      });
    }

    // Get total foods (you'll need to import foodModel)
    const foodModel = require("../models/foodModel");
    const totalFoods = await foodModel.countDocuments({
      restaurantId: restaurant._id,
    });

    // Get total orders (you'll need to import orderModel)
    const orderModel = require("../models/orderModel");
    const totalOrders = await orderModel.countDocuments({
      restaurantId: restaurant._id,
    });

    // Get today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysOrders = await orderModel.countDocuments({
      restaurantId: restaurant._id,
      createdAt: { $gte: today },
    });

    // Get pending orders
    const pendingOrders = await orderModel.countDocuments({
      restaurantId: restaurant._id,
      status: { $in: ["PENDING", "CONFIRMED", "PREPARING"] },
    });

    // Calculate total revenue (you might want to implement this properly)
    const revenueResult = await orderModel.aggregate([
      {
        $match: {
          restaurantId: restaurant._id,
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

    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    res.status(200).send({
      status: true,
      stats: {
        restaurant,
        totalFoods,
        totalOrders,
        todaysOrders,
        pendingOrders,
        totalRevenue,
      },
    });
  } catch (error) {
    console.log("Error getting restaurant stats", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  updateRestaurantDetails,
  getRestaurantStats,
};
