const BalanceLock = require("../middlewares/balanceLock");
const PlatformWallet = require("../models/PlatformWallet");
const PayoutUtils = require("./payoutUtils");

class MoneyFlow {
  constructor() {
    this.platformCommission = 0.15; // 15% default
    this.driverCommission = 0.8; // 80% to driver (rest is platform fee for delivery)
  }

  /**
   * ORDER COMPLETED - Main money partition flow
   */
  async handleOrderCompletion(order) {
    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const orderAmount = order.payment.amount;
      const updates = [];

      // 1. Calculate splits
      const splits = this.calculateSplits(order);

      // 2. Update VENDOR earnings (with 24h hold)
      updates.push({
        type: "user",
        userId: order.restaurantId.vendorId,
        updates: {
          holdBalance: splits.vendorEarnings,
          totalEarned: splits.vendorEarnings,
        },
      });

      // 3. Update DRIVER earnings (with 24h hold)
      if (order.driverId) {
        updates.push({
          type: "driver",
          driverId: order.driverId,
          updates: {
            holdBalance: splits.driverEarnings,
            totalEarnings: splits.driverEarnings,
          },
        });
      }

      // 4. Update PLATFORM wallet (commission + delivery fee)
      updates.push({
        type: "platform",
        updates: {
          "escrowBreakdown.vendorHold": splits.vendorEarnings,
          "escrowBreakdown.driverHold": splits.driverEarnings,
          "escrowBreakdown.platformEarnings": splits.platformEarnings,
          totalEscrow: splits.totalEscrow,
          "todayAggregation.driverEarnings": splits.driverEarnings,
          "todayAggregation.vendorEarnings": splits.vendorEarnings,
          "todayAggregation.platformCommission": splits.platformEarnings,
          "todayAggregation.totalTransactions": 1,
        },
      });

      // 5. Execute all updates in transaction
      await BalanceLock.batchUpdate(updates, session);

      // 6. Create hold release schedule (24h from now)
      const holdReleaseTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await this.scheduleHoldRelease(
        order._id,
        splits,
        holdReleaseTime,
        session,
      );

      await session.commitTransaction();

      return {
        success: true,
        splits,
        holdReleaseTime,
        message: "Money partitioned successfully. Hold for 24h.",
      };
    } catch (error) {
      await session.abortTransaction();
      console.error("Money partition error:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Calculate money splits for an order
   */
  calculateSplits(order) {
    const orderAmount = order.payment.amount;
    const restaurant = order.restaurantId;
    const deliveryCharge = order.deliveryCharge || 0;
    const tip = order.tip || 0;

    // Get commission rates
    const vendorCommissionRate =
      restaurant.commissionRate || this.platformCommission;
    const driverCommissionRate = this.driverCommission;

    // Calculate vendor earnings
    const vendorCommission = orderAmount * vendorCommissionRate;
    const vendorEarnings = orderAmount - vendorCommission;

    // Calculate driver earnings
    const driverBase = deliveryCharge * driverCommissionRate;
    const driverEarnings = driverBase + tip;
    const platformDeliveryFee = deliveryCharge - driverBase;

    // Platform total earnings
    const platformEarnings = vendorCommission + platformDeliveryFee;

    // Total in escrow
    const totalEscrow = vendorEarnings + driverEarnings + platformEarnings;

    return {
      orderAmount,
      deliveryCharge,
      tip,

      // Vendor
      vendorCommissionRate,
      vendorCommission,
      vendorEarnings,

      // Driver
      driverCommissionRate,
      driverBase,
      driverEarnings,
      platformDeliveryFee,

      // Platform
      platformEarnings,

      // Totals
      totalEscrow,

      // Breakdown for display
      breakdown: {
        vendor: {
          gross: orderAmount,
          commission: vendorCommission,
          net: vendorEarnings,
          commissionRate: vendorCommissionRate * 100,
        },
        driver: {
          deliveryFee: deliveryCharge,
          platformCut: platformDeliveryFee,
          driverCut: driverBase,
          tip: tip,
          total: driverEarnings,
        },
        platform: {
          vendorCommission: vendorCommission,
          deliveryFee: platformDeliveryFee,
          total: platformEarnings,
        },
      },
    };
  }

  /**
   * Schedule hold release after 24h
   */
  async scheduleHoldRelease(orderId, splits, releaseTime, session) {
    const HoldRelease = require("../models/HoldRelease");

    await HoldRelease.create(
      [
        {
          order: orderId,
          vendor: {
            id: splits.vendorId,
            amount: splits.vendorEarnings,
            releaseAt: releaseTime,
          },
          driver: splits.driverId
            ? {
                id: splits.driverId,
                amount: splits.driverEarnings,
                releaseAt: releaseTime,
              }
            : null,
          platformAmount: splits.platformEarnings,
          status: "PENDING",
          autoRelease: true,
        },
      ],
      { session },
    );
  }

  /**
   * RELEASE HOLD AFTER 24H - Move from hold to available
   */
  async releaseHoldAmounts(holdReleaseId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const HoldRelease = require("../models/HoldRelease");
      const hold = await HoldRelease.findById(holdReleaseId).session(session);

      if (!hold || hold.status !== "PENDING") {
        throw new Error("Invalid or already processed hold");
      }

      const updates = [];
      const now = new Date();

      // Release vendor hold
      if (hold.vendor && hold.vendor.amount > 0) {
        updates.push({
          type: "user",
          userId: hold.vendor.id,
          updates: {
            holdBalance: -hold.vendor.amount,
            available: hold.vendor.amount,
          },
        });

        // Update platform wallet
        updates.push({
          type: "platform",
          updates: {
            "escrowBreakdown.vendorHold": -hold.vendor.amount,
            availableForPayout: hold.vendor.amount,
          },
        });
      }

      // Release driver hold
      if (hold.driver && hold.driver.amount > 0) {
        updates.push({
          type: "driver",
          driverId: hold.driver.id,
          updates: {
            holdBalance: -hold.driver.amount,
            availableBalance: hold.driver.amount,
          },
        });

        // Update platform wallet
        updates.push({
          type: "platform",
          updates: {
            "escrowBreakdown.driverHold": -hold.driver.amount,
            availableForPayout: hold.driver.amount,
          },
        });
      }

      // Platform earnings (no hold, immediately available)
      if (hold.platformAmount > 0) {
        updates.push({
          type: "platform",
          updates: {
            "escrowBreakdown.platformEarnings": -hold.platformAmount,
            availableForPayout: hold.platformAmount,
          },
        });
      }

      // Execute updates
      await BalanceLock.batchUpdate(updates, session);

      // Mark hold as released
      hold.status = "RELEASED";
      hold.releasedAt = now;
      await hold.save({ session });

      await session.commitTransaction();

      return {
        success: true,
        releasedAt: now,
        amounts: {
          vendor: hold.vendor?.amount || 0,
          driver: hold.driver?.amount || 0,
          platform: hold.platformAmount || 0,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      console.error("Hold release error:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * HANDLE DISPUTE - Adjust money flow
   */
  async handleDispute(disputeId, resolution) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const Dispute = require("../models/Dispute");
      const dispute = await Dispute.findById(disputeId)
        .populate("order")
        .session(session);

      if (!dispute) {
        throw new Error("Dispute not found");
      }

      const order = dispute.order;
      const refundAmount = resolution.refundAmount || 0;
      const updates = [];

      // Calculate who pays for refund
      const responsibility = this.calculateRefundResponsibility(
        order,
        dispute.type,
        refundAmount,
      );

      // 1. Refund customer (from platform wallet)
      if (refundAmount > 0) {
        updates.push({
          type: "platform",
          updates: {
            availableForPayout: -refundAmount,
            "escrowBreakdown.disputeHold": refundAmount,
          },
        });

        // TODO: Trigger actual refund to customer via Razorpay
      }

      // 2. Deduct from vendor if responsible
      if (responsibility.vendor > 0) {
        updates.push({
          type: "user",
          userId: order.restaurantId.vendorId,
          updates: {
            holdBalance: -responsibility.vendor,
          },
        });

        updates.push({
          type: "platform",
          updates: {
            "escrowBreakdown.vendorHold": -responsibility.vendor,
          },
        });
      }

      // 3. Deduct from driver if responsible
      if (responsibility.driver > 0 && order.driverId) {
        updates.push({
          type: "driver",
          driverId: order.driverId,
          updates: {
            holdBalance: -responsibility.driver,
          },
        });

        updates.push({
          type: "platform",
          updates: {
            "escrowBreakdown.driverHold": -responsibility.driver,
          },
        });
      }

      // 4. Platform absorbs remaining
      if (responsibility.platform > 0) {
        updates.push({
          type: "platform",
          updates: {
            "escrowBreakdown.platformEarnings": -responsibility.platform,
          },
        });
      }

      // Execute updates
      await BalanceLock.batchUpdate(updates, session);

      // Update dispute resolution
      dispute.resolution = resolution;
      dispute.status = "RESOLVED";
      dispute.resolvedAt = new Date();
      await dispute.save({ session });

      await session.commitTransaction();

      return {
        success: true,
        resolution,
        responsibility,
        refundAmount,
      };
    } catch (error) {
      await session.abortTransaction();
      console.error("Dispute handling error:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Calculate who pays for refund
   */
  calculateRefundResponsibility(order, disputeType, refundAmount) {
    // Default: Platform absorbs all (for now)
    // Can be enhanced with business rules

    const responsibility = {
      vendor: 0,
      driver: 0,
      platform: refundAmount,
    };

    // Business rules
    switch (disputeType) {
      case "QUALITY_ISSUE":
      case "MISSING_ITEMS":
      case "WRONG_ORDER":
        // Vendor responsible
        responsibility.vendor = refundAmount * 0.8;
        responsibility.platform = refundAmount * 0.2;
        break;

      case "LATE_DELIVERY":
      case "DRIVER_ISSUE":
        // Driver responsible
        responsibility.driver = refundAmount * 0.5;
        responsibility.platform = refundAmount * 0.5;
        break;

      case "DAMAGED":
        // Split between vendor and driver
        responsibility.vendor = refundAmount * 0.4;
        responsibility.driver = refundAmount * 0.4;
        responsibility.platform = refundAmount * 0.2;
        break;

      default:
        // Platform absorbs
        responsibility.platform = refundAmount;
    }

    return responsibility;
  }

  /**
   * DAILY AUTO-PAYOUT - Distribute available balances
   */
  async processDailyPayouts() {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const User = require("../models/userModel");
      const Driver = require("../models/Driver");
      const Payout = require("../models/Payout");
      const batchId = PayoutUtils.generateBatchId();

      // 1. Get all vendors with available balance > ₹100
      const vendors = await User.find({
        "wallet.available": { $gte: 100 },
        "autoPayout.enabled": true,
        "autoPayout.upiId": { $exists: true, $ne: "" },
      }).session(session);

      // 2. Get all drivers with available balance > ₹100
      const drivers = await Driver.find({
        availableBalance: { $gte: 100 },
        "payoutSettings.upiId": { $exists: true, $ne: "" },
      }).session(session);

      const payouts = [];
      const updates = [];

      // 3. Process vendor payouts
      for (const vendor of vendors) {
        const amount = vendor.wallet.available;
        const fee = PayoutUtils.calculatePayoutFee(amount);
        const netAmount = amount - fee;

        // Create payout record
        const payout = await Payout.create(
          [
            {
              batchId,
              recipientType: "VENDOR",
              recipientId: vendor._id,
              amount,
              fees: fee,
              netAmount,
              method: "UPI",
              accountDetails: {
                upiId: vendor.autoPayout.upiId,
                accountHolder: vendor.userName,
              },
              status: "PENDING",
              scheduledAt: new Date(),
            },
          ],
          { session },
        );

        payouts.push(payout[0]);

        // Update vendor balance
        updates.push({
          type: "user",
          userId: vendor._id,
          updates: {
            available: -amount,
            totalEarned: 0, // This is just transfer, not deduction
          },
        });
      }

      // 4. Process driver payouts
      for (const driver of drivers) {
        const amount = driver.availableBalance;
        const fee = PayoutUtils.calculatePayoutFee(amount);
        const netAmount = amount - fee;

        // Create payout record
        const payout = await Payout.create(
          [
            {
              batchId,
              recipientType: "DRIVER",
              recipientId: driver._id,
              amount,
              fees: fee,
              netAmount,
              method: "UPI",
              accountDetails: {
                upiId: driver.payoutSettings.upiId,
                accountHolder: driver.user?.userName || "Driver",
              },
              status: "PENDING",
              scheduledAt: new Date(),
            },
          ],
          { session },
        );

        payouts.push(payout[0]);

        // Update driver balance
        updates.push({
          type: "driver",
          driverId: driver._id,
          updates: {
            availableBalance: -amount,
          },
        });
      }

      // 5. Update platform wallet
      const totalPayout = payouts.reduce((sum, p) => sum + p.amount, 0);
      const totalFees = payouts.reduce((sum, p) => sum + p.fees, 0);

      updates.push({
        type: "platform",
        updates: {
          availableForPayout: -totalPayout,
        },
      });

      // 6. Execute all balance updates
      await BalanceLock.batchUpdate(updates, session);

      await session.commitTransaction();

      return {
        success: true,
        batchId,
        payoutsCount: payouts.length,
        totalAmount: totalPayout,
        totalFees,
        vendors: vendors.length,
        drivers: drivers.length,
      };
    } catch (error) {
      await session.abortTransaction();
      console.error("Daily payout processing error:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get user's payout summary
   */
  async getUserPayoutSummary(userId, userType) {
    const now = new Date();
    const nextPayout = PayoutUtils.getNextPayoutTime();

    let available = 0;
    let hold = 0;

    if (userType === "vendor") {
      const User = require("../models/userModel");
      const user = await User.findById(userId).select("wallet");
      available = user.wallet.available || 0;
      hold = user.wallet.holdBalance || 0;
    } else if (userType === "driver") {
      const Driver = require("../models/Driver");
      const driver = await Driver.findById(userId);
      available = driver.availableBalance || 0;
      hold = driver.holdBalance || 0;
    }

    return {
      available,
      hold,
      nextPayout: {
        time: nextPayout,
        formatted: nextPayout.toLocaleString("en-IN", {
          weekday: "long",
          hour: "2-digit",
          minute: "2-digit",
        }),
        countdown: PayoutUtils.formatTimeRemaining(nextPayout),
        minimumAmount: 100,
      },
      willPayout: available >= 100,
      estimatedPayout: available >= 100 ? available : 0,
    };
  }
}

module.exports = new MoneyFlow();
