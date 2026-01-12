const userModel = require("../models/userModel");
const adminMiddleware = async (req, res, next) => {
  try {
    const id = req.userId;
    // console.log("Admin middleware userId:", id);
    if (!id) {
      return res.status(401).send({
        status: false,
        message: "authorization error",
      });
    }

    const user = await userModel.findById(id);
    if (!user) {
      return res.status(401).send({
        status: false,
        message: "user not found",
      });
    }
    if (user.userType !== "admin") {
      return res.status(401).send({
        status: false,
        message: "user not admin",
      });
    }
    next();
  } catch (err) {
    console.log("Error in admin middleware", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

module.exports = { adminMiddleware };
