const Driver = require("../models/Driver");

const driverMiddleware = async (req, res, next) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Find driver
    const driver = await Driver.findOne({ user: userId });

    if (!driver) {
      return res.status(403).json({
        success: false,
        message: "Driver profile not found",
      });
    }

    if (!driver.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Driver account not verified yet",
      });
    }

    // Attach driver to request
    req.driver = driver;
    next();
  } catch (error) {
    console.error("Driver middleware error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = driverMiddleware;
