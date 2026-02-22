const mongoose = require("mongoose");

const userWalletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      unique: true,
    },

    userType: {
      type: String,
      enum: ["vendor", "driver"],
      required: true,
    },

    // Balances
    available: {
      type: Number,
      default: 0,
      min: 0,
    },

    inHold: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalEarned: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Payout settings
    payoutSettings: {
      autoPayout: {
        type: Boolean,
        default: true,
      },
      method: {
        type: String,
        enum: ["UPI", "BANK_TRANSFER"],
        default: "UPI",
      },
      destination: {
        upiId: String,
        accountNumber: String,
        ifscCode: String,
        bankName: String,
        accountHolder: String,
      },
      minAmount: {
        type: Number,
        default: 100,
        min: 100,
      },
    },

    // Statistics
    totalPayouts: {
      type: Number,
      default: 0,
    },
    lastPayoutDate: Date,
    lastPayoutAmount: Number,
  },
  { timestamps: true },
);

// Indexes
userWalletSchema.index({ userType: 1, available: 1 });
userWalletSchema.index({ "payoutSettings.autoPayout": 1, available: 1 });

// Check if eligible for auto-payout
userWalletSchema.methods.isEligibleForPayout = function () {
  return (
    this.payoutSettings.autoPayout &&
    this.available >= this.payoutSettings.minAmount &&
    this.payoutSettings.destination &&
    (this.payoutSettings.destination.upiId ||
      this.payoutSettings.destination.accountNumber)
  );
};

// Add to hold balance
userWalletSchema.methods.addToHold = async function (amount) {
  this.inHold += amount;
  this.totalEarned += amount;
  return this.save();
};

// Release from hold to available
userWalletSchema.methods.releaseFromHold = async function (amount) {
  if (this.inHold < amount) {
    throw new Error("Insufficient hold balance");
  }
  this.inHold -= amount;
  this.available += amount;
  return this.save();
};

module.exports = mongoose.model("UserWallet", userWalletSchema);
