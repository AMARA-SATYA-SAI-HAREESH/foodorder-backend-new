const Order = require("../models/orderModel");
const MoneyDistributionService = require("../services/MoneyDistributionService");
const DriverEarning = require("../models/DriverEarning");
const Restaurant = require("../models/restaurantModel");

class OrderMoneyController {
  /**
   * Trigger when order is delivered - MONEY DISTRIBUTION
   */
  async onOrderDelivered(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate("restaurantId")
        .populate("driverId");

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.status !== "DELIVERED") {
        throw new Error("Order not delivered yet");
      }

      // Check if payout already processed
      if (order.payoutInfo.status !== "PENDING") {
        console.log(`Payout already processed for order ${orderId}`);
        return { success: false, message: "Payout already processed" };
      }

      // Calculate payout amounts
      await order.calculatePayouts();

      // Process money distribution through service
      const result =
        await MoneyDistributionService.processOrderCompletion(order);

      // Update order with escrow hold ID
      order.payoutInfo.escrowHoldId = result.holdId;
      order.payoutInfo.status = "IN_HOLD";
      await order.save();

      // Create driver earning record if driver exists
      if (order.driverId) {
        await DriverEarning.create({
          driver: order.driverId,
          order: order._id,
          orderAmount: order.payment.amount,
          deliveryFee: order.deliveryFee || 0,
          tip: order.tip || 0,
          driverEarnings: order.payoutInfo.driverAmount,
          status: "IN_HOLD",
          completedAt: new Date(),
          holdReleaseAt: order.payoutInfo.holdEnd,
          escrowHoldId: result.holdId,
        });

        // Update driver's hold balance
        const Driver = require("../models/Driver");
        await Driver.findByIdAndUpdate(order.driverId, {
          $inc: {
            holdBalance: order.payoutInfo.driverAmount,
            totalEarnings: order.payoutInfo.driverAmount,
          },
        });
      }

      // Update restaurant earnings
      const restaurant = await Restaurant.findById(order.restaurantId);
      if (restaurant) {
        await restaurant.updateEarnings(
          order.payoutInfo.vendorAmount,
          "earned",
        );
      }

      console.log(`💰 Money distributed for order ${orderId}:`);
      console.log(`   Vendor: ₹${order.payoutInfo.vendorAmount}`);
      console.log(`   Driver: ₹${order.payoutInfo.driverAmount}`);
      console.log(`   Platform: ₹${order.payoutInfo.platformCommission}`);
      console.log(`   Hold until: ${order.payoutInfo.holdEnd}`);

      return {
        success: true,
        message: "Money placed in 24-hour escrow hold",
        holdId: result.holdId,
        holdEnd: order.payoutInfo.holdEnd,
        amounts: {
          vendor: order.payoutInfo.vendorAmount,
          driver: order.payoutInfo.driverAmount,
          platform: order.payoutInfo.platformCommission,
        },
      };
    } catch (error) {
      console.error("Order delivery money handling error:", error);
      throw error;
    }
  }

  /**
   * Update order status with money distribution
   */
  async updateOrderStatusWithPayout(orderId, status, actor = "SYSTEM") {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error("Order not found");
      }

      const oldStatus = order.status;
      order.status = status;

      // If delivered, trigger money distribution
      if (status === "DELIVERED" && oldStatus !== "DELIVERED") {
        await order.save(); // Save status first

        // Trigger money distribution asynchronously
        setTimeout(async () => {
          try {
            await this.onOrderDelivered(orderId);
            console.log(`✅ Auto-payout triggered for order ${orderId}`);
          } catch (error) {
            console.error(`❌ Auto-payout failed for order ${orderId}:`, error);
          }
        }, 1000); // 1 second delay to ensure order is saved
      } else {
        await order.save();
      }

      return {
        success: true,
        order,
        payoutTriggered: status === "DELIVERED",
      };
    } catch (error) {
      console.error("Update order status with payout error:", error);
      throw error;
    }
  }

  /**
   * Manually release hold (admin only)
   */
  async manualReleaseHold(orderId) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.payoutInfo.status !== "IN_HOLD") {
        throw new Error("Payout not in hold status");
      }

      // Release through MoneyDistributionService
      const result = await MoneyDistributionService.releaseEscrowHold(
        order.payoutInfo.escrowHoldId,
      );

      // Update order status
      order.payoutInfo.status = "RELEASED";
      order.payoutInfo.releasedAt = new Date();
      await order.save();

      // Update driver earning status
      if (order.driverId) {
        await DriverEarning.findOneAndUpdate(
          { order: orderId },
          { status: "AVAILABLE", holdReleaseAt: new Date() },
        );

        // Update driver balance
        const Driver = require("../models/Driver");
        await Driver.findByIdAndUpdate(order.driverId, {
          $inc: {
            holdBalance: -order.payoutInfo.driverAmount,
            availableBalance: order.payoutInfo.driverAmount,
          },
        });
      }

      // Update restaurant earnings
      const restaurant = await Restaurant.findById(order.restaurantId);
      if (restaurant) {
        await restaurant.updateEarnings(
          order.payoutInfo.vendorAmount,
          "released",
        );
      }

      return {
        success: true,
        message: "Hold manually released",
        releasedAt: order.payoutInfo.releasedAt,
        amounts: result.amounts,
      };
    } catch (error) {
      console.error("Manual release hold error:", error);
      throw error;
    }
  }

  /**
   * Get order payout details
   */
  async getOrderPayoutDetails(orderId) {
    try {
      const order = await Order.findById(orderId).select(
        "payoutInfo status payment restaurantId driverId timeline",
      );

      if (!order) {
        throw new Error("Order not found");
      }

      // Calculate time remaining for hold
      let timeRemaining = null;
      if (order.payoutInfo.status === "IN_HOLD" && order.payoutInfo.holdEnd) {
        const now = new Date();
        const holdEnd = new Date(order.payoutInfo.holdEnd);
        if (holdEnd > now) {
          const diff = holdEnd - now;
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          timeRemaining = `${hours}h ${minutes}m`;
        }
      }

      return {
        success: true,
        orderId,
        status: order.status,
        payoutStatus: order.payoutInfo.status,
        amounts: {
          vendor: order.payoutInfo.vendorAmount,
          driver: order.payoutInfo.driverAmount,
          platform: order.payoutInfo.platformCommission,
          total: order.payment.amount,
        },
        holdInfo: {
          start: order.payoutInfo.holdStart,
          end: order.payoutInfo.holdEnd,
          timeRemaining,
          duration: order.payoutInfo.holdDuration,
        },
        timeline:
          order.timeline?.filter(
            (t) =>
              t.status.includes("MONEY") ||
              t.note.includes("escrow") ||
              t.note.includes("payout"),
          ) || [],
      };
    } catch (error) {
      console.error("Get order payout details error:", error);
      throw error;
    }
  }

  /**
   * Process payout for available balance
   */
  async processPayoutForOrder(orderId) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.payoutInfo.status !== "RELEASED") {
        throw new Error("Payout not yet released from hold");
      }

      // This would integrate with PayoutProcessor for actual payment
      // For now, just mark as paid
      order.payoutInfo.status = "PAID";
      order.payoutInfo.paidAt = new Date();
      await order.save();

      // Update driver earning
      if (order.driverId) {
        await DriverEarning.findOneAndUpdate(
          { order: orderId },
          { status: "PAID", paidAt: new Date() },
        );
      }

      return {
        success: true,
        message: "Payout marked as paid",
        paidAt: order.payoutInfo.paidAt,
        orderId,
      };
    } catch (error) {
      console.error("Process payout for order error:", error);
      throw error;
    }
  }
}

module.exports = new OrderMoneyController();
