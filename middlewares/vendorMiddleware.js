// middlewares/vendorMiddleware.js
const userModel = require("../models/userModel");
const restaurantModel = require("../models/restaurantModel");

const vendorMiddleware = async (req, res, next) => {
  try {
    const id = req.userId;

    if (!id) {
      return res.status(401).send({
        status: false,
        message: "Authorization error",
      });
    }

    const user = await userModel.findById(id);
    if (!user) {
      return res.status(401).send({
        status: false,
        message: "User not found",
      });
    }

    if (user.userType !== "vendor") {
      return res.status(403).send({
        status: false,
        message: "Access denied. Vendor privileges required",
      });
    }

    // Add vendor info to request
    req.vendor = user;

    // Check if vendor has a restaurant
    const restaurant = await restaurantModel.findOne({ vendorId: id });
    if (restaurant) {
      req.restaurantId = restaurant._id;
      req.restaurant = restaurant;
    }

    next();
  } catch (err) {
    console.log("Error in vendor middleware", err);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

// Middleware to check if vendor owns a specific restaurant
const vendorRestaurantMiddleware = async (req, res, next) => {
  try {
    const vendorId = req.userId;
    const restaurantId =
      req.params.restaurantId ||
      req.body.restaurantId ||
      req.query.restaurantId;

    if (!restaurantId) {
      return res.status(400).send({
        status: false,
        message: "Restaurant ID is required",
      });
    }

    const restaurant = await restaurantModel.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).send({
        status: false,
        message: "Restaurant not found",
      });
    }

    if (restaurant.vendorId.toString() !== vendorId.toString()) {
      return res.status(403).send({
        status: false,
        message: "You don't have permission to manage this restaurant",
      });
    }

    req.restaurant = restaurant;
    next();
  } catch (err) {
    console.log("Error in vendor restaurant middleware", err);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = { vendorMiddleware, vendorRestaurantMiddleware };
