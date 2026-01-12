const restaurantModel = require("../models/restaurantModel");
const createRestaurant = async (req, res) => {
  try {
    const {
      title,
      imageUrl,
      logoUrl,
      code,
      time,
      pickup,
      delivery,
      isOpen,
      rating,
      ratingCount,
      coords,
    } = req.body;
    if (!title) {
      return res.status(400).send({
        status: false,
        message: "title is required",
      });
    }
    const restaurant = await restaurantModel.create({
      title,
      imageUrl,
      logoUrl,
      code,
      time,
      pickup,
      delivery,
      isOpen,
      rating,
      ratingCount,
      coords,
    });
    res.status(200).send({
      status: true,
      message: "restaurant created successfully",
      restaurant,
    });
  } catch (err) {
    console.log("Error in creatingRestaurant api", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

const updateRestaurant = async (req, res) => {
  try {
    const {
      id,
      title,
      imageUrl,
      logoUrl,
      code,
      time,
      pickup,
      delivery,
      isOpen,
      rating,
      ratingCount,
      coords,
    } = req.body;

    if (!title || !id) {
      return res.status(400).send({
        status: false,
        message: "invalid datai",
      });
    }

    const restaurant = await restaurantModel.findByIdAndUpdate(id);

    if (!restaurant) {
      return res.status(404).send({
        status: false,
        message: "restaurant not found",
      });
    }
    Object.assign(restaurant, {
      title,
      imageUrl,
      logoUrl,
      code,
      time,
      pickup,
      delivery,
      isOpen,
      rating,
      ratingCount,
      coords,
    });
    await restaurant.save();
    res.status(200).send({
      status: true,
      message: "restaurant updated successfully",
      restaurant,
    });
  } catch (err) {
    console.log("Error in updatingRestaurant api", err);
  }
};

const deleteRestaurant = async (req, res) => {
  try {
    const id = req.query.id;
    const restaurant = await restaurantModel.findById(id);
    if (!restaurant) {
      return res.status(404).send({
        status: false,
        message: "restaurant not found",
      });
    }
    await restaurantModel.findByIdAndDelete(id);
    res.status(200).send({
      status: true,
      message: "restaurant deleted successfully",
    });
  } catch (err) {
    console.log("Error in deletingRestaurant api", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

const getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await restaurantModel.find({});
    if (!restaurants) {
      return res.status(404).send({
        status: false,
        message: "not restaurants found",
      });
    }
    res.status(200).send({
      status: true,
      message: "all restaurants fetched successfully",
      restaurants,
    });
  } catch (err) {
    console.log("Error in getting all restaurants", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

const getRestaurant = async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.status(400).send({
        status: false,
        message: "restaurant id is required",
      });
    }
    const restaurant = await restaurantModel.findById(id);
    if (!restaurant) {
      return res.status(404).send({
        status: false,
        message: "restaurant not found",
      });
    }
    res.status(200).send({
      status: true,
      message: "restaurant found successfully",
      restaurant,
    });
  } catch (err) {
    console.log("Error in getting restaurant", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

module.exports = {
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getAllRestaurants,
  getRestaurant,
};
