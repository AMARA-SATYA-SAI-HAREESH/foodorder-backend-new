// controllers/vendorFoodController.js
const foodModel = require("../models/foodModel");
const restaurantModel = require("../models/restaurantModel");

// Get All Foods for Vendor's Restaurant
const getVendorFoods = async (req, res) => {
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

    // Get all foods for this restaurant
    const foods = await foodModel
      .find({ restaurantId: restaurant._id })
      .populate("categoryId", "title");

    res.status(200).send({
      status: true,
      foods,
      total: foods.length,
    });
  } catch (error) {
    console.log("Error getting vendor foods", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

// Create Food for Vendor's Restaurant
const createVendorFood = async (req, res) => {
  try {
    const vendorId = req.userId;
    const {
      title,
      description,
      price,
      foodTags,
      imageUrl,
      categoryId,
      code,
      isAvailable,
      rating,
    } = req.body;

    // Validation
    if (!title || !description || !price || !categoryId) {
      return res.status(400).send({
        status: false,
        message: "Title, description, price, and category are required",
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

    // Create food
    const food = new foodModel({
      title,
      description,
      price,
      foodTags: foodTags || [],
      imageUrl: imageUrl || "",
      categoryId,
      code: code || "",
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      restaurantId: restaurant._id,
      rating: rating || 5,
    });

    await food.save();

    res.status(201).send({
      status: true,
      message: "Food created successfully",
      food,
    });
  } catch (error) {
    console.log("Error creating vendor food", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

// Update Food (only if belongs to vendor's restaurant)
const updateVendorFood = async (req, res) => {
  try {
    const vendorId = req.userId;
    const foodId = req.query.id || req.body.id;

    if (!foodId) {
      return res.status(400).send({
        status: false,
        message: "Food ID is required",
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

    // Find food and check if it belongs to vendor's restaurant
    const food = await foodModel.findOne({
      _id: foodId,
      restaurantId: restaurant._id,
    });

    if (!food) {
      return res.status(404).send({
        status: false,
        message: "Food not found or you don't have permission to update it",
      });
    }

    // Update fields
    const updatableFields = [
      "title",
      "description",
      "price",
      "foodTags",
      "imageUrl",
      "categoryId",
      "code",
      "isAvailable",
      "rating",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        food[field] = req.body[field];
      }
    });

    await food.save();

    res.status(200).send({
      status: true,
      message: "Food updated successfully",
      food,
    });
  } catch (error) {
    console.log("Error updating vendor food", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

// Delete Food (only if belongs to vendor's restaurant)
const deleteVendorFood = async (req, res) => {
  try {
    const vendorId = req.userId;
    const foodId = req.params.id || req.query.id;

    if (!foodId) {
      return res.status(400).send({
        status: false,
        message: "Food ID is required",
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

    // Find and delete food
    const result = await foodModel.findOneAndDelete({
      _id: foodId,
      restaurantId: restaurant._id,
    });

    if (!result) {
      return res.status(404).send({
        status: false,
        message: "Food not found or you don't have permission to delete it",
      });
    }

    res.status(200).send({
      status: true,
      message: "Food deleted successfully",
    });
  } catch (error) {
    console.log("Error deleting vendor food", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

// Toggle Food Availability
const toggleFoodAvailability = async (req, res) => {
  try {
    const vendorId = req.userId;
    const foodId = req.query.id || req.body.id;

    if (!foodId) {
      return res.status(400).send({
        status: false,
        message: "Food ID is required",
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

    // Find food
    const food = await foodModel.findOne({
      _id: foodId,
      restaurantId: restaurant._id,
    });

    if (!food) {
      return res.status(404).send({
        status: false,
        message: "Food not found",
      });
    }

    // Toggle availability
    food.isAvailable = !food.isAvailable;
    await food.save();

    res.status(200).send({
      status: true,
      message: `Food ${
        food.isAvailable ? "available" : "unavailable"
      } successfully`,
      food,
    });
  } catch (error) {
    console.log("Error toggling food availability", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getVendorFoods,
  createVendorFood,
  updateVendorFood,
  deleteVendorFood,
  toggleFoodAvailability,
};
