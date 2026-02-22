const foodModel = require("../models/foodModel");
const createFood = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      foodTags,
      imageUrl,
      categoryId,
      code,
      isAvailable,
      restaurantId,
      rating,
    } = req.body;
    if (!title || !description || !price || !categoryId || !restaurantId) {
      return res.status(400).send({
        status: false,
        message: "required fields are missing",
      });
    }
    const food = new foodModel({
      title,
      description,
      price,
      foodTags,
      imageUrl,
      categoryId,
      code,
      isAvailable,
      restaurantId,
      rating,
    });
    await food.save();
    res.status(201).send({
      status: true,
      message: "new food created",
      food,
    });
  } catch (err) {
    console.log("Error in creating food api", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

const updateFood = async (req, res) => {
  try {
    const {
      id,
      title,
      description,
      price,
      foodTags,
      imageUrl,
      categoryId,
      code,
      isAvailable,
      restaurantId,
      rating,
    } = req.body;
    if (
      !id ||
      !title ||
      !description ||
      !price ||
      !categoryId ||
      !restaurantId
    ) {
      return res.status(400).send({
        status: false,
        message: "required fields are missing",
      });
    }

    const existingfood = await foodModel.findById(id);
    if (!existingfood) {
      return res.status(400).send({
        status: false,
        message: "food not found",
      });
    }
    Object.assign(existingfood, {
      title,
      description,
      price,
      foodTags,
      imageUrl,
      categoryId,
      code,
      isAvailable,
      restaurantId,
      rating,
    });
    const updatedFood = await existingfood.save();
    res.status(201).send({
      status: true,
      message: "updated food successfully",
      updatedFood,
    });
  } catch (err) {
    console.log("Error in updating food api", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

const deleteFood = async (req, res) => {
  try {
    const id = req.query.id;
    console.log("req.query:", req.query);
    if (!id) {
      return res.status(400).send({
        status: false,
        message: "food id is required",
      });
    }
    const existingfood = await foodModel.findById(id);
    if (!existingfood) {
      return res.status(400).send({
        status: false,
        message: "food not found",
      });
    }
    await foodModel.findByIdAndDelete(id);
    res.status(201).send({
      status: true,
      message: "new food deleted successfully",
    });
  } catch (err) {
    console.log("Error in updating food api", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

const getAllFoods = async (req, res) => {
  try {
    const foods = await foodModel.find({});
    if (!foods) {
      return res.status(200).send({
        status: false,
        message: "no foods found",
      });
    }
    res.status(200).send({
      status: true,
      message: "foods fetched successfully",
      foods,
    });
  } catch (err) {
    console.log("Error in getting all foods api", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

const getFood = async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.status(400).send({
        status: false,
        message: "food id is required",
      });
    }
    const food = await foodModel.findById(id);
    if (!food) {
      return res.status(400).send({
        status: false,
        message: "food not found",
      });
    }
    res.status(200).send({
      status: true,
      message: "food fetched successfully",
      food,
    });
  } catch (err) {
    console.log("Error in getting food api", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

const getFoodsbyrestaurant = async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.status(400).send({
        status: false,
        message: "restaurent id is required",
      });
    }
    const foods = await foodModel.find({ restaurantId: id });
    if (!foods) {
      return res.status(400).send({
        status: false,
        message: "food not found",
      });
    }
    res.status(200).send({
      status: true,
      message: "food fetched successfully",
      foods,
    });
  } catch (err) {
    console.log("Error in getting food api", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

const getFoodsbycategory = async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.status(400).send({
        status: false,
        message: "food id is required",
      });
    }
    const foods = await foodModel.find({ categoryId: id });
    if (!foods) {
      return res.status(400).send({
        status: false,
        message: "food not found",
      });
    }
    res.status(200).send({
      status: true,
      message: "food fetched successfully",
      foods,
    });
  } catch (err) {
    console.log("Error in getting food api", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

module.exports = {
  createFood,
  updateFood,
  deleteFood,
  getAllFoods,
  getFood,
  getFoodsbyrestaurant,
  getFoodsbycategory,
};
