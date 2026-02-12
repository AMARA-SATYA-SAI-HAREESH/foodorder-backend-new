// routes/vendorFoodRoutes.js
const express = require("express");
const {
  getVendorFoods,
  createVendorFood,
  updateVendorFood,
  deleteVendorFood,
  toggleFoodAvailability,
} = require("../controllers/vendorFoodController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { vendorMiddleware } = require("../middlewares/vendorMiddleware");

const router = express.Router();

router.use(authMiddleware, vendorMiddleware);

router.get("/", getVendorFoods);
router.post("/", createVendorFood);
router.put("/", updateVendorFood);
router.delete("/", deleteVendorFood);
router.put("/toggle-availability", toggleFoodAvailability);

module.exports = router;
