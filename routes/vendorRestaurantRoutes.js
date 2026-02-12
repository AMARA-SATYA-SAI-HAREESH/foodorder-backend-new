// routes/vendorRestaurantRoutes.js
const express = require("express");
const {
  updateRestaurantDetails,
  getRestaurantStats,
} = require("../controllers/vendorRestaurantController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { vendorMiddleware } = require("../middlewares/vendorMiddleware");

const router = express.Router();

router.use(authMiddleware, vendorMiddleware);

router.put("/update", updateRestaurantDetails);
router.get("/stats", getRestaurantStats);

module.exports = router;
