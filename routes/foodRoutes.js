const express = require("express");
const router = express.Router();
const {
  createFood,
  updateFood,
  deleteFood,
  getAllFoods,
  getFood,
  getFoodsbyrestaurant,
  getFoodsbycategory,
} = require("../controllers/foodController");

router.post("/create-food", createFood);
router.post("/update-food", updateFood);
router.delete("/delete-food", deleteFood);
router.get("/getAllFoods", getAllFoods);
router.get("/getFood", getFood);
router.get("/getFoodsbyrestaurant", getFoodsbyrestaurant);
router.get("/getFoodsbycategory", getFoodsbycategory);
router.get("/getAllFoods", getAllFoods);

module.exports = router;
