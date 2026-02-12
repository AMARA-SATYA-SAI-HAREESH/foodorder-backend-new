const userModel = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const register = async (req, res) => {
  try {
    const {
      userName,
      email,
      password,
      address,
      phone,
      answer,
      userType,
      profile,
    } = req.body;
    if (!userName || !email || !password || !address || !phone || !answer) {
      return res.status(400).send({
        status: false,
        message: "Invalid Data",
      });
    }
    const existingUser = await userModel.findOne({ email: email });
    if (existingUser) {
      return res.status(400).send({
        status: false,
        message: "Account already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newuser = await userModel.create({
      userName,
      email,
      password: hashedPassword,
      address,
      phone,
      answer,
      userType,
      profile,
    });
    const token = jwt.sign(
      {
        id: newuser._id,
        userType: newuser.userType,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.status(200).send({
      status: true,
      user: newuser,
      token,
    });
  } catch (error) {
    console.log("Error in creating user API", error);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send({
        status: false,
        message: "Invalid Data",
      });
    }
    const existingUser = await userModel.findOne({ email: email });
    if (!existingUser) {
      return res.status(400).send({
        status: false,
        message: "Account not exists",
      });
    }
    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) {
      return res.status(400).send({
        status: false,
        message: "Invalid password",
      });
    }
    existingUser.password = undefined;
    var token = jwt.sign(
      { id: existingUser._id, userType: existingUser.userType },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );
    res.status(200).send({
      status: true,
      token,
      user: existingUser,
    });
  } catch (error) {
    console.log("Error in creating user API", error);
  }
};

const newPassword = async (req, res) => {
  try {
    const { email, answer, newPassword } = req.body;
    if (!email || !answer || !newPassword) {
      return res.status(400).send({
        status: false,
        message: "Invalid Data",
      });
    }
    const existingUser = await userModel.findOne({ email: email });
    if (!existingUser) {
      return res.status(400).send({
        status: false,
        message: "account not exists",
      });
    }

    if (existingUser.answer !== answer) {
      return res.status(400).send({
        status: false,
        message: "Incorrect answer",
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    existingUser.password = hashedPassword;
    await existingUser.save();
    res.status(200).send({
      status: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.log("Error in reset password API", error);
  }
};

const deleteUser = async (req, res) => {
  try {
    console.log("req.userId:", req.userId);
    console.log("req.userType:", req.userType);
    console.log("req.query.id:", req.query.id);

    const id = req.query.id;

    // Check if ID is provided
    if (!id) {
      return res.status(400).send({
        status: false,
        message: "User ID is required",
      });
    }

    // Find the user to be deleted
    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).send({
        status: false,
        message: "User not found",
      });
    }

    // Get logged-in user from token (set by authMiddleware)
    const loggedInUserId = req.userId;
    const loggedInUserType = req.userType;

    // Only admin can delete other users
    if (loggedInUserType !== "admin" && loggedInUserId !== id) {
      return res.status(403).send({
        status: false,
        message: "You are not allowed to delete this user",
      });
    }

    // Delete the user
    await userModel.findByIdAndDelete(id);

    res.status(200).send({
      status: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.log("Error in delete user API", error);
    res.status(500).send({
      status: false,
      message: "Error in deleting user",
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find({});
    if (!users) {
      return res.status(404).send({
        status: false,
        message: "no users found",
      });
    }
    res.status(200).send({
      status: true,
      message: "users fetched successfully",
      users,
    });
  } catch (error) {
    console.error("error", error);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

module.exports = { register, login, newPassword, deleteUser, getAllUsers };
