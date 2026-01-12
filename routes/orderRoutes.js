const express = require("express");
const { authMiddleware } = require("../middlewares/authMiddleware");
const {
  createOrder,
  changeStatus,
  getAllOrders,
} = require("../controllers/orderController");
const router = express.Router();

router.post("/create-order", authMiddleware, createOrder);
router.post("/change-status-order", changeStatus);
router.get("/getAllOrders", getAllOrders);

module.exports = router;
