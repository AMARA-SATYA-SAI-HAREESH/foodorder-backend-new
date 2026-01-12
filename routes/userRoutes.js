const express = require("express");
const { model } = require("mongoose");
const {
  register,
  login,
  newPassword,
  deleteUser,
  getAllUsers,
} = require("../controllers/userController");
const { authMiddleware } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.post("/update-Password", newPassword);

router.post("/delete-user", authMiddleware, deleteUser);

router.get("/GetAllUsers", getAllUsers);

module.exports = router;
