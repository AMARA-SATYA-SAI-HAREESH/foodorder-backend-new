// const express = require("express");
// const { model } = require("mongoose");
// const {
//   register,
//   login,
//   newPassword,
//   deleteUser,
//   getAllUsers,
// } = require("../controllers/userController");
// const { authMiddleware } = require("../middlewares/authMiddleware");

// const router = express.Router();

// router.post("/register", register);

// router.post("/login", login);

// router.post("/update-Password", newPassword);

// router.post("/delete-user", authMiddleware, deleteUser);

// router.get("/GetAllUsers", getAllUsers);

// module.exports = router;

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
const {
  cacheMiddleware,
  clearCache,
} = require("../middlewares/cacheMiddleware");
const { authLimiter } = require("../middlewares/rateLimitMiddleware");

const router = express.Router();

// Auth routes with rate limiting (5 attempts per 15 minutes)
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/update-Password", authLimiter, newPassword);

// Protected routes - clear user cache
router.post(
  "/delete-user",
  authMiddleware,
  async (req, res, next) => {
    await clearCache("cache:/user/GetAllUsers*");
    next();
  },
  deleteUser,
);

// GET users with caching (2 minutes)
router.get("/GetAllUsers", cacheMiddleware(120), getAllUsers);

module.exports = router;
