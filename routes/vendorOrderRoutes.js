// routes/vendorOrderRoutes.js
const express = require("express");
const {
  getVendorOrders,
  getVendorOrderDetails,
  updateOrderStatus,
  acceptRejectOrder,
  getTodaysOrders,
  getOrderStats,
} = require("../controllers/vendorOrderController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { vendorMiddleware } = require("../middlewares/vendorMiddleware");

const router = express.Router();

router.use(authMiddleware, vendorMiddleware);

router.get("/", getVendorOrders);
router.get("/today", getTodaysOrders);
router.get("/stats", getOrderStats);
// router.get("/:id", getVendorOrderDetails);
router.put("/status", updateOrderStatus);
router.put("/accept-reject", acceptRejectOrder);
router.get("/details", getVendorOrderDetails);

module.exports = router;
