const cron = require("node-cron");
const MoneyDistributionService = require("./MoneyDistributionService");
const PayoutProcessor = require("./PayoutProcessor");
const UserWallet = require("../models/UserWallet");
const PayoutRecord = require("../models/PayoutRecord");

class AutoPayoutService {
  constructor() {
    this.isProcessing = false;
    this.setupSchedules();
  }

  setupSchedules() {
    // Release escrow holds every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
      await this.processDueEscrowHolds();
    });

    // Daily auto-payout at 2 AM
    cron.schedule("0 2 * * *", async () => {
      await this.processDailyPayouts();
    });

    // Retry failed payouts hourly
    cron.schedule("0 * * * *", async () => {
      await this.retryFailedPayouts();
    });

    console.log("Auto-payout schedules initialized");
  }

  // Process due escrow holds
  async processDueEscrowHolds(limit = 100) {
    if (this.isProcessing) {
      console.log("Already processing escrow holds");
      return;
    }

    this.isProcessing = true;

    try {
      const result = await MoneyDistributionService.processDueHolds(limit);
      console.log(
        `Escrow holds processed: ${result.released} released, ${result.failed} failed`,
      );
    } catch (error) {
      console.error("Process due escrow holds error:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Process daily payouts
  async processDailyPayouts() {
    console.log("Starting daily auto-payouts...");

    try {
      // Get all wallets eligible for payout
      const eligibleWallets = await UserWallet.find({
        "payoutSettings.autoPayout": true,
        available: { $gte: 100 }, // Minimum ₹100
      });

      console.log(
        `Found ${eligibleWallets.length} wallets eligible for payout`,
      );

      if (eligibleWallets.length === 0) {
        console.log("No eligible wallets for payout");
        return;
      }

      // Generate batch ID
      const batchId = `BATCH_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 6)}`;

      let processed = 0;
      let failed = 0;

      for (const wallet of eligibleWallets) {
        try {
          // Validate payout destination
          if (
            !wallet.payoutSettings.destination.upiId &&
            !wallet.payoutSettings.destination.accountNumber
          ) {
            console.log(`Skipping wallet ${wallet.user}: No payout method set`);
            continue;
          }

          // Create payout record
          const payoutRecord = await PayoutRecord.create({
            batchId,
            recipientType: wallet.userType.toUpperCase(),
            recipientId: wallet.user,
            amount: wallet.available,
            netAmount: wallet.available,
            method: wallet.payoutSettings.method,
            destination: wallet.payoutSettings.destination,
            status: "SCHEDULED",
            scheduledFor: new Date(),
          });

          // Process payout
          const result = await PayoutProcessor.processPayout(payoutRecord);

          if (result.success) {
            // Deduct from wallet
            wallet.available = 0;
            wallet.totalPayouts += payoutRecord.amount;
            wallet.lastPayoutDate = new Date();
            wallet.lastPayoutAmount = payoutRecord.amount;
            await wallet.save();

            processed++;
            console.log(
              `Processed payout for ${wallet.userType} ${wallet.user}: ₹${payoutRecord.amount}`,
            );
          } else {
            payoutRecord.status = "FAILED";
            payoutRecord.failureReason = result.error;
            await payoutRecord.save();

            failed++;
            console.error(
              `Failed payout for ${wallet.userType} ${wallet.user}: ${result.error}`,
            );
          }
        } catch (error) {
          failed++;
          console.error(
            `Error processing wallet ${wallet.user}:`,
            error.message,
          );
        }
      }

      console.log(
        `Daily payouts completed: ${processed} processed, ${failed} failed`,
      );
    } catch (error) {
      console.error("Daily payout processing error:", error);
    }
  }

  // Retry failed payouts
  async retryFailedPayouts() {
    try {
      const failedPayouts = await PayoutRecord.find({
        status: "FAILED",
        retryCount: { $lt: 3 },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }).limit(20);

      if (failedPayouts.length === 0) return;

      console.log(`Retrying ${failedPayouts.length} failed payouts`);

      for (const payout of failedPayouts) {
        try {
          // Check if wallet still has balance
          const wallet = await UserWallet.findOne({ user: payout.recipientId });
          if (!wallet || wallet.available < payout.amount) {
            console.log(
              `Skipping retry for payout ${payout._id}: Insufficient balance`,
            );
            continue;
          }

          const result = await PayoutProcessor.processPayout(payout, true);

          if (result.success) {
            payout.status = "PROCESSING";
            payout.retryCount += 1;
            payout.lastRetry = new Date();
            await payout.save();
            console.log(`Retry successful for payout ${payout._id}`);
          } else {
            payout.retryCount += 1;
            payout.lastRetry = new Date();
            payout.failureReason = result.error;
            await payout.save();
            console.log(
              `Retry failed for payout ${payout._id}: ${result.error}`,
            );
          }
        } catch (error) {
          console.error(`Error retrying payout ${payout._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error("Retry failed payouts error:", error);
    }
  }

  // Manual trigger for testing
  async manualTrigger(action, data = {}) {
    switch (action) {
      case "process_holds":
        return await this.processDueEscrowHolds(data.limit);
      case "process_payouts":
        return await this.processDailyPayouts();
      case "retry_payouts":
        return await this.retryFailedPayouts();
      default:
        throw new Error("Invalid action");
    }
  }
}

module.exports = new AutoPayoutService();
