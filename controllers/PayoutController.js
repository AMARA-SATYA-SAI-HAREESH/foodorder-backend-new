const UserWallet = require("../models/UserWallet");
const PayoutRecord = require("../models/PayoutRecord");
const PayoutProcessor = require("../services/PayoutProcessor");

class PayoutController {
  // Get wallet summary
  async getWalletSummary(req, res) {
    try {
      const wallet = await UserWallet.findOne({ user: req.userId });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }

      // Calculate next payout time (daily at 2 AM)
      const nextPayoutTime = this.calculateNextPayoutTime();

      // Get recent payouts
      const recentPayouts = await PayoutRecord.find({
        recipientId: req.userId,
        status: "COMPLETED",
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      res.json({
        success: true,
        wallet: {
          available: wallet.available,
          inHold: wallet.inHold,
          totalEarned: wallet.totalEarned,
          totalPayouts: wallet.totalPayouts,
          lastPayoutDate: wallet.lastPayoutDate,
          lastPayoutAmount: wallet.lastPayoutAmount,
        },
        payoutSettings: wallet.payoutSettings,
        nextPayout: {
          time: nextPayoutTime,
          formatted: nextPayoutTime.toLocaleString("en-IN", {
            weekday: "long",
            hour: "2-digit",
            minute: "2-digit",
          }),
          eligible: wallet.available >= wallet.payoutSettings.minAmount,
          estimatedAmount: wallet.available,
        },
        recentPayouts: recentPayouts.map((p) => ({
          id: p._id,
          amount: p.amount,
          status: p.status,
          method: p.method,
          createdAt: p.createdAt,
          utr: p.utr,
        })),
      });
    } catch (error) {
      console.error("Get wallet summary error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Update payout settings
  async updatePayoutSettings(req, res) {
    try {
      const { upiId, method, autoPayout, minAmount, bankDetails } = req.body;

      const wallet = await UserWallet.findOne({ user: req.userId });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }

      // Validate UPI if provided
      if (upiId) {
        const validation = PayoutProcessor.validateUPI(upiId);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: validation.message,
          });
        }
        wallet.payoutSettings.destination.upiId = upiId;
      }

      // Update bank details if provided
      if (bankDetails) {
        wallet.payoutSettings.destination = {
          ...wallet.payoutSettings.destination,
          ...bankDetails,
        };
      }

      // Update other settings
      if (method) wallet.payoutSettings.method = method;
      if (autoPayout !== undefined)
        wallet.payoutSettings.autoPayout = autoPayout;
      if (minAmount) wallet.payoutSettings.minAmount = Math.max(minAmount, 100);

      await wallet.save();

      res.json({
        success: true,
        message: "Payout settings updated",
        payoutSettings: wallet.payoutSettings,
      });
    } catch (error) {
      console.error("Update payout settings error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get payout history
  async getPayoutHistory(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;

      const query = { recipientId: req.userId };
      if (status) query.status = status;

      const payouts = await PayoutRecord.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await PayoutRecord.countDocuments(query);

      res.json({
        success: true,
        payouts: payouts.map((p) => ({
          id: p._id,
          batchId: p.batchId,
          amount: p.amount,
          netAmount: p.netAmount,
          status: p.status,
          method: p.method,
          createdAt: p.createdAt,
          processedAt: p.processedAt,
          completedAt: p.completedAt,
          utr: p.utr,
          failureReason: p.failureReason,
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Get payout history error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Request manual payout (emergency)
  async requestManualPayout(req, res) {
    try {
      const { amount } = req.body;
      const wallet = await UserWallet.findOne({ user: req.userId });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }

      // Validate amount
      const payoutAmount = amount || wallet.available;
      if (payoutAmount < wallet.payoutSettings.minAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum payout amount is ₹${wallet.payoutSettings.minAmount}`,
        });
      }

      if (payoutAmount > wallet.available) {
        return res.status(400).json({
          success: false,
          message: "Insufficient available balance",
        });
      }

      // Check payout method is set
      if (
        !wallet.payoutSettings.destination.upiId &&
        !wallet.payoutSettings.destination.accountNumber
      ) {
        return res.status(400).json({
          success: false,
          message: "Please set payout method (UPI or Bank) first",
        });
      }

      // Create manual payout record
      const payoutRecord = await PayoutRecord.create({
        batchId: `MANUAL_${Date.now()}`,
        recipientType: wallet.userType.toUpperCase(),
        recipientId: req.userId,
        amount: payoutAmount,
        netAmount: payoutAmount,
        method: wallet.payoutSettings.method,
        destination: wallet.payoutSettings.destination,
        status: "SCHEDULED",
        scheduledFor: new Date(),
        notes: "Manual payout request",
      });

      // Process immediately
      const result = await PayoutProcessor.processPayout(payoutRecord);

      if (result.success) {
        // Deduct from wallet
        wallet.available -= payoutAmount;
        wallet.totalPayouts += payoutAmount;
        wallet.lastPayoutDate = new Date();
        wallet.lastPayoutAmount = payoutAmount;
        await wallet.save();

        res.json({
          success: true,
          message: "Manual payout processed",
          payoutId: payoutRecord._id,
          amount: payoutAmount,
          estimatedTime: "Within 2 hours",
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      console.error("Manual payout error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Helper: Calculate next payout time
  calculateNextPayoutTime() {
    const now = new Date();
    const payoutTime = new Date(now);
    payoutTime.setHours(2, 0, 0, 0); // 2 AM
    if (now > payoutTime) payoutTime.setDate(payoutTime.getDate() + 1);
    return payoutTime;
  }
}

module.exports = new PayoutController();
