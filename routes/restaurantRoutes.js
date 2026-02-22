const express = require("express");
const {
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getAllRestaurants,
  getRestaurant,
} = require("../controllers/restaurantController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { adminMiddleware } = require("../middlewares/adminMiddleware");
const router = express.Router();
router.post(
  "/create-restaurant",
  authMiddleware,
  adminMiddleware,
  createRestaurant
);
router.post(
  "/update-restaurant",
  authMiddleware,
  adminMiddleware,
  updateRestaurant
);
router.delete(
  "/delete-restaurant",
  authMiddleware,
  adminMiddleware,
  deleteRestaurant
);
router.get("/getAllRestaurants", getAllRestaurants);
router.get("/getRestaurant", getRestaurant);
// router.get("/create-restaurant", createRestaurant);
module.exports = router;
