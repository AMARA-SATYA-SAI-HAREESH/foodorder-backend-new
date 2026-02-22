// controllers/vendorAuthController.js
const userModel = require("../models/userModel");
const restaurantModel = require("../models/restaurantModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Vendor Registration
const vendorRegister = async (req, res) => {
  try {
    const {
      userName,
      email,
      password,
      address,
      phone,
      answer,
      restaurantName,
      imageUrl, // ✅ ADD THIS
      latitude, // ✅ ADD THIS
      longitude, // ✅ ADD THIS
      city,
    } = req.body;

    // Validation
    if (
      !userName ||
      !email ||
      !password ||
      !address ||
      !phone ||
      !answer ||
      !restaurantName ||
      !imageUrl ||
      !latitude ||
      !longitude ||
      !city
    ) {
      return res.status(400).send({
        status: false,
        message: "All fields are required",
      });
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).send({
        status: false,
        message: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create vendor user
    const vendor = await userModel.create({
      userName,
      email,
      password: hashedPassword,
      address,
      phone,
      answer,
      city,
      userType: "vendor",
    });

    const restaurant = await restaurantModel.create({
      title: restaurantName,
      vendorId: vendor._id,
      imageUrl: imageUrl, // ✅ ADD THIS
      city: city, // ✅ ADD THIS
      coords: {
        // ✅ ADD THIS WHOLE BLOCK
        address: address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        title: restaurantName,
      },
      isVerified: false,
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: vendor._id, userType: vendor.userType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Remove password from response
    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    res.status(201).send({
      status: true,
      message: "Vendor registered successfully. Awaiting admin verification.",
      vendor: vendorResponse,
      restaurant,
      token,
    });
  } catch (error) {
    console.log("Error in vendor registration", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

// Vendor Login
const vendorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        status: false,
        message: "Email and password are required",
      });
    }

    // Find vendor user
    const vendor = await userModel.findOne({ email, userType: "vendor" });
    if (!vendor) {
      return res.status(401).send({
        status: false,
        message: "Invalid email or password",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, vendor.password);
    if (!isPasswordValid) {
      return res.status(401).send({
        status: false,
        message: "Invalid email or password",
      });
    }

    // Get vendor's restaurant
    const restaurant = await restaurantModel.findOne({ vendorId: vendor._id });

    // Generate JWT token
    const token = jwt.sign(
      { id: vendor._id, userType: vendor.userType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Remove password from response
    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    res.status(200).send({
      status: true,
      message: "Login successful",
      vendor: vendorResponse,
      restaurant,
      token,
    });
  } catch (error) {
    console.log("Error in vendor login", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

// Get Vendor Profile
const getVendorProfile = async (req, res) => {
  try {
    const vendorId = req.userId;

    const vendor = await userModel.findById(vendorId).select("-password");
    if (!vendor) {
      return res.status(404).send({
        status: false,
        message: "Vendor not found",
      });
    }

    const restaurant = await restaurantModel.findOne({ vendorId });

    res.status(200).send({
      status: true,
      vendor,
      restaurant,
    });
  } catch (error) {
    console.log("Error getting vendor profile", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

// Update Vendor Profile
const updateVendorProfile = async (req, res) => {
  try {
    const vendorId = req.userId;
    const { userName, address, phone, profile } = req.body;

    const vendor = await userModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({
        status: false,
        message: "Vendor not found",
      });
    }

    // Update fields if provided
    if (userName) vendor.userName = userName;
    if (address) vendor.address = address;
    if (phone) vendor.phone = phone;
    if (profile) vendor.profile = profile;

    await vendor.save();

    // Remove password from response
    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    res.status(200).send({
      status: true,
      message: "Profile updated successfully",
      vendor: vendorResponse,
    });
  } catch (error) {
    console.log("Error updating vendor profile", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  vendorRegister,
  vendorLogin,
  getVendorProfile,
  updateVendorProfile,
};
