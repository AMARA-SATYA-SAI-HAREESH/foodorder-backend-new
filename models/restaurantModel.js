// const mongoose = require("mongoose");
// const restaurantModel = new mongoose.Schema(
//   {
//     title: {
//       type: String,
//       required: [true, "title is required"],
//     },
//     imageUrl: {
//       type: String,
//       default: "",
//       trim: true,
//     },
//     logoUrl: {
//       type: String,
//       default: "",
//       trim: true,
//     },
//     code: {
//       type: String,
//       default: "",
//       trim: true,
//     },
//     time: {
//       type: String,
//     },
//     pickUp: {
//       type: Boolean,
//       default: true,
//     },
//     delivery: {
//       type: Boolean,
//       default: true,
//     },
//     isOpen: {
//       type: Boolean,
//       default: true,
//     },
//     rating: {
//       type: Number,
//       default: 5,
//       min: 0,
//       max: 5,
//     },
//     ratingCount: {
//       type: Number,
//       default: 1,
//     },
//     coords: {
//       address: { type: String, trim: true },
//       latitude: { type: Number },
//       longitude: { type: Number },
//       title: { type: String, trim: true },
//     },
//     vendorId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Users",
//       required: true,
//     },
//     // NEW: Additional vendor-specific fields
//     commissionRate: {
//       type: Number,
//       default: 15, // 15% commission by default
//     },
//     isVerified: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.mongoose.model("Restaurant", restaurantModel);

const mongoose = require("mongoose");
const restaurantModel = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "title is required"],
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    logoUrl: {
      type: String,
      default: "",
      trim: true,
    },
    code: {
      type: String,
      default: "",
      trim: true,
    },
    time: {
      type: String,
    },
    pickUp: {
      type: Boolean,
      default: true,
    },
    delivery: {
      type: Boolean,
      default: true,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 5,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 1,
    },
    coords: {
      address: { type: String, trim: true },
      latitude: { type: Number },
      longitude: { type: Number },
      title: { type: String, trim: true },
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    // Commission settings
    commissionRate: {
      type: Number,
      default: 15, // 15% commission by default
      min: 0,
      max: 50,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // ✅ AUTO-PAYOUT SYSTEM FIELDS (NEW)
    payoutSettings: {
      autoPayout: {
        type: Boolean,
        default: true,
      },
      minPayoutAmount: {
        type: Number,
        default: 100, // Minimum ₹100 for auto-payout
        min: 100,
      },
      payoutMethod: {
        type: String,
        enum: ["UPI", "BANK_TRANSFER"],
        default: "UPI",
      },
      upiId: String,
      bankAccount: {
        accountNumber: String,
        ifscCode: String,
        bankName: String,
        accountHolder: String,
      },
      lastPayoutDate: Date,
      totalPayouts: {
        type: Number,
        default: 0,
      },
    },

    // Earnings statistics (NEW)
    earningsStats: {
      totalEarned: {
        type: Number,
        default: 0,
      },
      availableBalance: {
        type: Number,
        default: 0,
      },
      inHoldBalance: {
        type: Number,
        default: 0,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
  },
  { timestamps: true },
);

// ✅ Method to update earnings (NEW)
restaurantModel.methods.updateEarnings = async function (
  amount,
  type = "earned",
) {
  if (type === "earned") {
    this.earningsStats.totalEarned += amount;
    this.earningsStats.inHoldBalance += amount;
  } else if (type === "released") {
    this.earningsStats.inHoldBalance -= amount;
    this.earningsStats.availableBalance += amount;
  } else if (type === "paid") {
    this.earningsStats.availableBalance -= amount;
    this.payoutSettings.totalPayouts += amount;
    this.payoutSettings.lastPayoutDate = new Date();
  }

  this.earningsStats.lastUpdated = new Date();
  return this.save();
};

// ✅ Method to check if eligible for payout (NEW)
restaurantModel.methods.isEligibleForPayout = function () {
  return (
    this.payoutSettings.autoPayout &&
    this.earningsStats.availableBalance >=
      this.payoutSettings.minPayoutAmount &&
    (this.payoutSettings.upiId || this.payoutSettings.bankAccount.accountNumber)
  );
};

module.exports = mongoose.model("Restaurant", restaurantModel);
