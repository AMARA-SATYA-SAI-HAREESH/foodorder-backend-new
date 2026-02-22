const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Driver = require("../models/Driver");

// 1. Driver Registration
exports.registerDriver = async (req, res) => {
  try {
    const {
      userName,
      email,
      password,
      phone,
      address,
      answer,
      vehicleType,
      vehicleNumber,
      licenseNumber,
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Check if driver already exists
    const existingDriver = await Driver.findOne({
      $or: [{ licenseNumber }, { vehicleNumber }],
    });
    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message: "Driver with same license or vehicle already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      userName,
      email,
      password: hashedPassword,
      phone,
      address,
      answer,
      userType: "driver",
      isDriver: true,
    });

    // Create driver
    const driver = await Driver.create({
      user: user._id,
      vehicleType,
      vehicleNumber: vehicleNumber.toUpperCase(),
      licenseNumber: licenseNumber.toUpperCase(),
      isVerified: true,
      verificationStatus: "APPROVED",
    });

    // Update user with driver reference
    user.driverProfile = driver._id;
    await user.save();

    // Generate token
    const token = jwt.sign(
      { id: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Driver registered successfully. Awaiting verification.",
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        userType: user.userType,
      },
      driver: {
        id: driver._id,
        vehicleNumber: driver.vehicleNumber,
        verificationStatus: driver.verificationStatus,
      },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 2. Driver Login
exports.loginDriver = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if driver
    if (user.userType !== "driver") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Not a driver account",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Get driver profile
    const driver = await Driver.findOne({ user: user._id });
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver profile not found",
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        userType: user.userType,
      },
      driver: {
        id: driver._id,
        vehicleNumber: driver.vehicleNumber,
        isVerified: driver.isVerified,
        isOnline: driver.isOnline,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 3. Check Availability
exports.checkAvailability = async (req, res) => {
  try {
    const { email, phone, licenseNumber, vehicleNumber } = req.query;

    const results = {};

    if (email) {
      const exists = await User.findOne({ email });
      results.email = exists ? "TAKEN" : "AVAILABLE";
    }

    if (phone) {
      const exists = await User.findOne({ phone });
      results.phone = exists ? "TAKEN" : "AVAILABLE";
    }

    if (licenseNumber) {
      const exists = await Driver.findOne({ licenseNumber });
      results.licenseNumber = exists ? "TAKEN" : "AVAILABLE";
    }

    if (vehicleNumber) {
      const exists = await Driver.findOne({ vehicleNumber });
      results.vehicleNumber = exists ? "TAKEN" : "AVAILABLE";
    }

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
