const express = require("express");
const router = express.Router();
const PayoutController = require("../controllers/PayoutController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const driverMiddleware = require("../middlewares/driverMiddleware");
const { vendorMiddleware } = require("../middlewares/vendorMiddleware");

// ==================== COMMON ROUTES (All authenticated users) ====================
router.use(authMiddleware);

// 1. Get wallet summary
router.get("/wallet", PayoutController.getWalletSummary);

// 2. Update payout settings
router.put("/settings", PayoutController.updatePayoutSettings);

// 3. Get payout history
router.get("/history", PayoutController.getPayoutHistory);

// 4. Request manual payout (emergency)
router.post("/request", PayoutController.requestManualPayout);

// ==================== VENDOR SPECIFIC ROUTES ====================
router.get("/vendor/earnings/summary", vendorMiddleware, async (req, res) => {
  try {
    const UserWallet = require("../models/UserWallet");
    const PlatformWallet = require("../models/PlatformWallet");

    const wallet = await UserWallet.findOne({
      user: req.userId,
      userType: "vendor",
    });

    const platformWallet = await PlatformWallet.getWallet();

    // Get today's date for calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate next payout time (2 AM daily)
    const nextPayoutTime = new Date();
    nextPayoutTime.setHours(2, 0, 0, 0);
    if (nextPayoutTime < today) {
      nextPayoutTime.setDate(nextPayoutTime.getDate() + 1);
    }

    res.json({
      success: true,
      wallet: {
        available: wallet?.available || 0,
        inHold: wallet?.inHold || 0,
        totalEarned: wallet?.totalEarned || 0,
      },
      platformStats: platformWallet.getSummary(),
      nextPayout: {
        time: nextPayoutTime,
        eligible: (wallet?.available || 0) >= 100,
        estimatedAmount: wallet?.available || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== DRIVER SPECIFIC ROUTES ====================
router.get("/driver/earnings/summary", driverMiddleware, async (req, res) => {
  try {
    const UserWallet = require("../models/UserWallet");
    const DriverEarning = require("../models/DriverEarning");

    const wallet = await UserWallet.findOne({
      user: req.driver._id,
      userType: "driver",
    });

    // Get today's earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEarnings = await DriverEarning.aggregate([
      {
        $match: {
          driver: req.driver._id,
          completedAt: { $gte: today },
          status: { $in: ["AVAILABLE", "PAID"] },
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$driverEarnings" },
          deliveries: { $sum: 1 },
          tips: { $sum: "$tip" },
          distance: { $sum: "$distance" },
        },
      },
    ]);

    // Calculate next payout time
    const nextPayoutTime = new Date();
    nextPayoutTime.setHours(2, 0, 0, 0);
    if (nextPayoutTime < today) {
      nextPayoutTime.setDate(nextPayoutTime.getDate() + 1);
    }

    res.json({
      success: true,
      wallet: {
        available: wallet?.available || 0,
        inHold: wallet?.inHold || 0,
        totalEarned: wallet?.totalEarned || 0,
      },
      today: todayEarnings[0] || {
        totalEarnings: 0,
        deliveries: 0,
        tips: 0,
        distance: 0,
      },
      nextPayout: {
        time: nextPayoutTime,
        eligible: (wallet?.available || 0) >= 100,
        estimatedAmount: wallet?.available || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== ADMIN ROUTES (For testing and monitoring) ====================
router.get("/admin/platform-summary", async (req, res) => {
  try {
    // Check if user is admin
    const User = require("../models/userModel");
    const user = await User.findById(req.userId);

    if (!user || user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const PlatformWallet = require("../models/PlatformWallet");
    const UserWallet = require("../models/UserWallet");
    const PayoutRecord = require("../models/PayoutRecord");

    const platformWallet = await PlatformWallet.getWallet();

    // Get wallet statistics
    const vendorWallets = await UserWallet.find({ userType: "vendor" });
    const driverWallets = await UserWallet.find({ userType: "driver" });

    // Get recent payouts
    const recentPayouts = await PayoutRecord.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("recipientId", "userName email");

    // Calculate totals
    const vendorTotal = vendorWallets.reduce(
      (sum, w) => sum + w.available + w.inHold,
      0,
    );
    const driverTotal = driverWallets.reduce(
      (sum, w) => sum + w.available + w.inHold,
      0,
    );

    res.json({
      success: true,
      platform: platformWallet.getSummary(),
      statistics: {
        totalVendors: vendorWallets.length,
        totalDrivers: driverWallets.length,
        vendorTotal,
        driverTotal,
        totalInSystem: vendorTotal + driverTotal + platformWallet.totalEscrow,
      },
      recentPayouts: recentPayouts.map((p) => ({
        id: p._id,
        recipient: p.recipientId?.userName || "Unknown",
        amount: p.amount,
        status: p.status,
        method: p.method,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Test endpoint for auto-payout system
router.get("/admin/test-payout", async (req, res) => {
  try {
    // Check if user is admin
    const User = require("../models/userModel");
    const user = await User.findById(req.userId);

    if (!user || user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const AutoPayoutService = require("../services/AutoPayoutService");

    // Test hold processing
    const holdResult = await AutoPayoutService.manualTrigger("process_holds", {
      limit: 10,
    });

    // Test payout processing
    const payoutResult =
      await AutoPayoutService.manualTrigger("process_payouts");

    res.json({
      success: true,
      message: "Auto-payout system test executed",
      results: {
        holdsProcessed: holdResult,
        payoutsProcessed: payoutResult,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Manual trigger for escrow release
router.post("/admin/release-escrow", async (req, res) => {
  try {
    const User = require("../models/userModel");
    const user = await User.findById(req.userId);

    if (!user || user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const MoneyDistributionService = require("../services/MoneyDistributionService");

    const result = await MoneyDistributionService.processDueHolds(50);

    res.json({
      success: true,
      message: "Escrow holds released",
      result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== HEALTH CHECK ====================
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Payout system is healthy",
    timestamp: new Date().toISOString(),
    endpoints: {
      wallet: "GET /api/payout/wallet",
      settings: "PUT /api/payout/settings",
      history: "GET /api/payout/history",
      manual: "POST /api/payout/request",
      vendorSummary: "GET /api/payout/vendor/earnings/summary",
      driverSummary: "GET /api/payout/driver/earnings/summary",
    },
  });
});

module.exports = router;
