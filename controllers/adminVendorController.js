// controllers/adminVendorController.js
const userModel = require("../models/userModel");
const restaurantModel = require("../models/restaurantModel");

// Get All Vendors
const getAllVendors = async (req, res) => {
  try {
    const vendors = await userModel
      .find({ userType: "vendor" })
      .select("-password")
      .populate({
        path: "restaurants",
        model: "Restaurant",
      });

    res.status(200).send({
      status: true,
      vendors,
      total: vendors.length,
    });
  } catch (error) {
    console.log("Error getting all vendors", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

// Verify/Unverify Vendor Restaurant
const verifyVendorRestaurant = async (req, res) => {
  try {
    const { vendorId, verify } = req.body;

    if (!vendorId || verify === undefined) {
      return res.status(400).send({
        status: false,
        message: "Vendor ID and verify status are required",
      });
    }

    const restaurant = await restaurantModel.findOne({ vendorId });
    if (!restaurant) {
      return res.status(404).send({
        status: false,
        message: "Restaurant not found for this vendor",
      });
    }

    restaurant.isVerified = verify;
    await restaurant.save();

    res.status(200).send({
      status: true,
      message: `Restaurant ${verify ? "verified" : "unverified"} successfully`,
      restaurant,
    });
  } catch (error) {
    console.log("Error verifying vendor restaurant", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

// Update Commission Rate
const updateCommissionRate = async (req, res) => {
  try {
    const { vendorId, commissionRate } = req.body;

    if (!vendorId || commissionRate === undefined) {
      return res.status(400).send({
        status: false,
        message: "Vendor ID and commission rate are required",
      });
    }

    if (commissionRate < 0 || commissionRate > 100) {
      return res.status(400).send({
        status: false,
        message: "Commission rate must be between 0 and 100",
      });
    }

    const restaurant = await restaurantModel.findOne({ vendorId });
    if (!restaurant) {
      return res.status(404).send({
        status: false,
        message: "Restaurant not found for this vendor",
      });
    }

    restaurant.commissionRate = commissionRate;
    await restaurant.save();

    res.status(200).send({
      status: true,
      message: "Commission rate updated successfully",
      restaurant,
    });
  } catch (error) {
    console.log("Error updating commission rate", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getAllVendors,
  verifyVendorRestaurant,
  updateCommissionRate,
};
