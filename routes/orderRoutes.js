const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { adminMiddleware } = require("../middlewares/adminMiddleware");
const {
  createOrder,
  changeStatus,
  getAllOrders,
  getUserOrders,
  clearOrderHistory,
} = require("../controllers/orderController");
const router = express.Router();

router.post("/create-order", authMiddleware, createOrder);
router.post("/change-status-order", changeStatus);
router.get("/getAllOrders", getAllOrders, adminMiddleware);
router.get("/getMyOrders", authMiddleware, getUserOrders);
// Add this route to your orderRoutes.js
router.post("/clear-history", authMiddleware, clearOrderHistory);
module.exports = router;
