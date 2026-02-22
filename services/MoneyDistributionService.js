const EscrowHold = require("../models/EscrowHold");
const UserWallet = require("../models/UserWallet");
const DriverEarning = require("../models/DriverEarning");
const PlatformWallet = require("../models/PlatformWallet");

class MoneyDistributionService {
  constructor() {
    this.defaultCommissionRate = 15; // 15%
    this.driverDeliveryShare = 0.8; // 80% to driver
  }

  // Process order completion
  async processOrderCompletion(order) {
    try {
      const Restaurant = require("../models/restaurantModel");
      const restaurant = await Restaurant.findById(order.restaurantId);

      if (!restaurant) {
        throw new Error("Restaurant not found");
      }

      // Calculate amounts
      const orderAmount = order.payment.amount;
      const commissionRate =
        restaurant.commissionRate || this.defaultCommissionRate;
      const commissionAmount = (orderAmount * commissionRate) / 100;
      const vendorEarnings = orderAmount - commissionAmount;

      // Calculate driver earnings if driver exists
      let driverEarnings = 0;
      let deliveryFee = order.deliveryFee || 0;
      let tip = order.tip || 0;

      if (order.driverId) {
        const driverShare = deliveryFee * this.driverDeliveryShare;
        driverEarnings = driverShare + tip;
      }

      // Calculate platform earnings
      const platformDeliveryFee =
        deliveryFee - deliveryFee * this.driverDeliveryShare;
      const platformEarnings = commissionAmount + platformDeliveryFee;

      // Create escrow hold
      const holdEnd = EscrowHold.calculateHoldEnd(24); // 24 hour hold

      const escrowHold = await EscrowHold.create({
        order: order._id,
        vendor: {
          vendorId: restaurant.vendorId,
          restaurantId: restaurant._id,
          amount: vendorEarnings,
          commissionRate,
        },
        driver: order.driverId
          ? {
              driverId: order.driverId,
              amount: driverEarnings,
              deliveryFee,
              tip,
            }
          : null,
        platform: {
          vendorCommission: commissionAmount,
          deliveryCommission: platformDeliveryFee,
          total: platformEarnings,
        },
        holdEnd,
      });

      // Update user wallets
      await this.updateWalletsAfterOrder(escrowHold);

      // Create driver earning record
      if (order.driverId) {
        await DriverEarning.create({
          driver: order.driverId,
          order: order._id,
          orderAmount,
          deliveryFee,
          tip,
          platformCommission: platformDeliveryFee,
          driverEarnings,
          status: "IN_HOLD",
          completedAt: new Date(),
          holdReleaseAt: holdEnd,
        });
      }

      // Update platform wallet
      await this.updatePlatformWallet(escrowHold);

      return {
        success: true,
        holdId: escrowHold._id,
        holdEnd,
        amounts: {
          vendor: vendorEarnings,
          driver: driverEarnings,
          platform: platformEarnings,
        },
      };
    } catch (error) {
      console.error("Process order completion error:", error);
      throw error;
    }
  }

  // Update wallets after order
  async updateWalletsAfterOrder(escrowHold) {
    try {
      // Update vendor wallet
      const vendorWallet = await UserWallet.findOne({
        user: escrowHold.vendor.vendorId,
      });

      if (vendorWallet) {
        await vendorWallet.addToHold(escrowHold.vendor.amount);
      } else {
        // Create wallet if doesn't exist
        await UserWallet.create({
          user: escrowHold.vendor.vendorId,
          userType: "vendor",
          inHold: escrowHold.vendor.amount,
          totalEarned: escrowHold.vendor.amount,
        });
      }

      // Update driver wallet if exists
      if (escrowHold.driver?.driverId) {
        const driverWallet = await UserWallet.findOne({
          user: escrowHold.driver.driverId,
        });

        if (driverWallet) {
          await driverWallet.addToHold(escrowHold.driver.amount);
        } else {
          // Create wallet if doesn't exist
          await UserWallet.create({
            user: escrowHold.driver.driverId,
            userType: "driver",
            inHold: escrowHold.driver.amount,
            totalEarned: escrowHold.driver.amount,
          });
        }
      }
    } catch (error) {
      console.error("Update wallets error:", error);
      throw error;
    }
  }

  // Update platform wallet
  async updatePlatformWallet(escrowHold) {
    try {
      const platformWallet = await PlatformWallet.getWallet();

      platformWallet.totalEscrow +=
        escrowHold.vendor.amount +
        (escrowHold.driver?.amount || 0) +
        escrowHold.platform.total;

      platformWallet.escrowBreakdown.vendorHold += escrowHold.vendor.amount;
      platformWallet.escrowBreakdown.driverHold +=
        escrowHold.driver?.amount || 0;
      platformWallet.escrowBreakdown.platformEarnings +=
        escrowHold.platform.total;

      await platformWallet.save();
    } catch (error) {
      console.error("Update platform wallet error:", error);
      throw error;
    }
  }

  // Release escrow hold
  async releaseEscrowHold(holdId) {
    try {
      const escrowHold = await EscrowHold.findById(holdId);

      if (!escrowHold || escrowHold.status !== "ACTIVE") {
        throw new Error("Hold not found or not active");
      }

      if (!escrowHold.isDueForRelease()) {
        throw new Error("Hold period not yet completed");
      }

      // Release vendor amount
      const vendorWallet = await UserWallet.findOne({
        user: escrowHold.vendor.vendorId,
      });
      if (vendorWallet) {
        await vendorWallet.releaseFromHold(escrowHold.vendor.amount);
      }

      // Release driver amount
      if (escrowHold.driver?.driverId) {
        const driverWallet = await UserWallet.findOne({
          user: escrowHold.driver.driverId,
        });
        if (driverWallet) {
          await driverWallet.releaseFromHold(escrowHold.driver.amount);
        }

        // Update driver earning status
        await DriverEarning.findOneAndUpdate(
          { order: escrowHold.order },
          { status: "AVAILABLE", holdReleaseAt: new Date() },
        );
      }

      // Update platform wallet
      const platformWallet = await PlatformWallet.getWallet();
      platformWallet.escrowBreakdown.vendorHold -= escrowHold.vendor.amount;
      platformWallet.escrowBreakdown.driverHold -=
        escrowHold.driver?.amount || 0;
      platformWallet.availableForPayout +=
        escrowHold.vendor.amount + (escrowHold.driver?.amount || 0);
      await platformWallet.save();

      // Mark hold as released
      escrowHold.status = "RELEASED";
      escrowHold.releasedAt = new Date();
      await escrowHold.save();

      return {
        success: true,
        releasedAt: escrowHold.releasedAt,
        amounts: {
          vendor: escrowHold.vendor.amount,
          driver: escrowHold.driver?.amount || 0,
        },
      };
    } catch (error) {
      console.error("Release escrow hold error:", error);
      throw error;
    }
  }

  // Process due holds
  async processDueHolds(limit = 50) {
    try {
      const dueHolds = await EscrowHold.find({
        status: "ACTIVE",
        holdEnd: { $lte: new Date() },
        "dispute.hasDispute": false,
      }).limit(limit);

      let released = 0;
      let failed = 0;

      for (const hold of dueHolds) {
        try {
          await this.releaseEscrowHold(hold._id);
          released++;
        } catch (error) {
          failed++;
          console.error(`Failed to release hold ${hold._id}:`, error.message);
        }
      }

      return { released, failed, total: dueHolds.length };
    } catch (error) {
      console.error("Process due holds error:", error);
      throw error;
    }
  }
}

module.exports = new MoneyDistributionService();
