const mongoose = require("mongoose");

const platformWalletSchema = new mongoose.Schema(
  {
    // Total money in platform control
    totalEscrow: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Breakdown of escrow funds
    escrowBreakdown: {
      vendorHold: { type: Number, default: 0 }, // 24h hold for vendors
      driverHold: { type: Number, default: 0 }, // 24h hold for drivers
      disputeHold: { type: Number, default: 0 }, // Disputed amounts
      platformEarnings: { type: Number, default: 0 }, // Platform commission
      availableForPayout: { type: Number, default: 0 }, // Ready for payout
    },

    // Daily statistics
    dailyStats: [
      {
        date: Date,
        totalOrders: Number,
        totalAmount: Number,
        vendorPayouts: Number,
        driverPayouts: Number,
        platformEarnings: Number,
        commissionCollected: Number,
      },
    ],

    // Reconciliation
    lastReconciliation: {
      date: Date,
      razorpayBalance: Number,
      systemBalance: Number,
      difference: Number,
      reconciledBy: String,
      notes: String,
    },

    // Current day aggregation
    todayAggregation: {
      vendorEarnings: { type: Number, default: 0 },
      driverEarnings: { type: Number, default: 0 },
      platformCommission: { type: Number, default: 0 },
      totalTransactions: { type: Number, default: 0 },
    },

    // Payout statistics
    payoutStats: {
      totalPayouts: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      lastPayoutDate: Date,
      failedPayouts: { type: Number, default: 0 },
      pendingPayouts: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Get or create platform wallet (singleton)
platformWalletSchema.statics.getWallet = async function () {
  let wallet = await this.findOne();
  if (!wallet) {
    wallet = await this.create({});
  }
  return wallet;
};

// Update today's aggregation
platformWalletSchema.methods.updateTodayAggregation = async function (
  type,
  amount,
) {
  const today = new Date().toDateString();
  const lastUpdate = this.updatedAt.toDateString();

  // Reset if new day
  if (today !== lastUpdate) {
    this.todayAggregation = {
      vendorEarnings: 0,
      driverEarnings: 0,
      platformCommission: 0,
      totalTransactions: 0,
    };
  }

  switch (type) {
    case "vendor":
      this.todayAggregation.vendorEarnings += amount;
      break;
    case "driver":
      this.todayAggregation.driverEarnings += amount;
      break;
    case "commission":
      this.todayAggregation.platformCommission += amount;
      break;
  }

  this.todayAggregation.totalTransactions += 1;
  await this.save();
};

// Add to escrow
platformWalletSchema.methods.addToEscrow = async function (type, amount) {
  switch (type) {
    case "vendor":
      this.escrowBreakdown.vendorHold += amount;
      break;
    case "driver":
      this.escrowBreakdown.driverHold += amount;
      break;
    case "platform":
      this.escrowBreakdown.platformEarnings += amount;
      break;
  }

  this.totalEscrow += amount;
  await this.save();
};

// Move from hold to available for payout
platformWalletSchema.methods.releaseFromHold = async function (type, amount) {
  switch (type) {
    case "vendor":
      if (this.escrowBreakdown.vendorHold < amount) {
        throw new Error("Insufficient vendor hold balance");
      }
      this.escrowBreakdown.vendorHold -= amount;
      this.escrowBreakdown.availableForPayout += amount;
      break;
    case "driver":
      if (this.escrowBreakdown.driverHold < amount) {
        throw new Error("Insufficient driver hold balance");
      }
      this.escrowBreakdown.driverHold -= amount;
      this.escrowBreakdown.availableForPayout += amount;
      break;
  }

  await this.save();
};

// Process payout (deduct from available)
platformWalletSchema.methods.processPayout = async function (amount) {
  if (this.escrowBreakdown.availableForPayout < amount) {
    throw new Error("Insufficient available balance for payout");
  }

  this.escrowBreakdown.availableForPayout -= amount;
  this.payoutStats.totalPayouts += 1;
  this.payoutStats.totalAmount += amount;
  this.payoutStats.lastPayoutDate = new Date();

  await this.save();
};

// Record failed payout
platformWalletSchema.methods.recordFailedPayout = async function (amount) {
  this.payoutStats.failedPayouts += 1;
  this.escrowBreakdown.availableForPayout += amount; // Return to available
  await this.save();
};

// Add daily stats
platformWalletSchema.methods.addDailyStats = async function (stats) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingStat = this.dailyStats.find(
    (stat) => stat.date.toDateString() === today.toDateString(),
  );

  if (existingStat) {
    // Update existing
    existingStat.totalOrders += stats.totalOrders || 0;
    existingStat.totalAmount += stats.totalAmount || 0;
    existingStat.vendorPayouts += stats.vendorPayouts || 0;
    existingStat.driverPayouts += stats.driverPayouts || 0;
    existingStat.platformEarnings += stats.platformEarnings || 0;
    existingStat.commissionCollected += stats.commissionCollected || 0;
  } else {
    // Add new
    this.dailyStats.push({
      date: today,
      totalOrders: stats.totalOrders || 0,
      totalAmount: stats.totalAmount || 0,
      vendorPayouts: stats.vendorPayouts || 0,
      driverPayouts: stats.driverPayouts || 0,
      platformEarnings: stats.platformEarnings || 0,
      commissionCollected: stats.commissionCollected || 0,
    });

    // Keep only last 30 days
    if (this.dailyStats.length > 30) {
      this.dailyStats = this.dailyStats.slice(-30);
    }
  }

  await this.save();
};

// Get platform wallet summary
platformWalletSchema.methods.getSummary = function () {
  return {
    totalEscrow: this.totalEscrow,
    breakdown: this.escrowBreakdown,
    todayAggregation: this.todayAggregation,
    payoutStats: this.payoutStats,
    lastReconciliation: this.lastReconciliation,
  };
};

module.exports = mongoose.model("PlatformWallet", platformWalletSchema);
