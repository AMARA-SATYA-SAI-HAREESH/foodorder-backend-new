// const mongoose = require("mongoose");

// const driverSchema = new mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Users",
//       required: true,
//       unique: true,
//     },
//     vehicleType: {
//       type: String,
//       enum: ["BIKE", "CAR", "SCOOTER", "BICYCLE"],
//       required: true,
//     },
//     vehicleNumber: {
//       type: String,
//       required: true,
//       unique: true,
//       uppercase: true,
//     },
//     licenseNumber: { type: String, required: true, unique: true },

//     // Documents
//     licenseImage: { type: String },
//     rcImage: { type: String },
//     insuranceImage: { type: String },
//     aadharImage: { type: String },

//     // Verification
//     isVerified: { type: Boolean, default: true },
//     verificationStatus: {
//       type: String,
//       enum: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"],
//       default: "APPROVED",
//     },

//     // Working Status
//     isOnline: { type: Boolean, default: false },
//     isAvailable: { type: Boolean, default: true },

//     // Location
//     currentLocation: {
//       lat: { type: Number },
//       lng: { type: Number },
//       address: { type: String },
//       lastUpdated: { type: Date },
//     },

//     // Performance
//     rating: { type: Number, default: 0 },
//     totalDeliveries: { type: Number, default: 0 },
//     totalEarnings: { type: Number, default: 0 },
//     availableBalance: { type: Number, default: 0 },
//     pendingBalance: { type: Number, default: 0 },

//     // Current Assignment
//     currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: "orders" },
//     lastActive: { type: Date, default: Date.now },
//     // Add scanning capability field:
//     canScanQR: { type: Boolean, default: true },
//     lastScanTime: { type: Date },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Driver", driverSchema);

const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      unique: true,
    },
    vehicleType: {
      type: String,
      enum: ["BIKE", "CAR", "SCOOTER", "BICYCLE"],
      required: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    licenseNumber: { type: String, required: true, unique: true },

    // Documents
    licenseImage: { type: String },
    rcImage: { type: String },
    insuranceImage: { type: String },
    aadharImage: { type: String },

    // Verification
    isVerified: { type: Boolean, default: true },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"],
      default: "APPROVED",
    },

    // Working Status
    isOnline: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },

    // Location
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
      address: { type: String },
      lastUpdated: { type: Date },
    },

    // Performance
    rating: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },

    // Current Assignment
    currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: "orders" },
    lastActive: { type: Date, default: Date.now },

    // Scanning capability
    canScanQR: { type: Boolean, default: true },
    lastScanTime: { type: Date },

    // ✅ AUTO-PAYOUT SYSTEM FIELDS (NEW)
    holdBalance: {
      type: Number,
      default: 0,
    },

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

    // Earnings tracking (NEW)
    earningsBreakdown: {
      deliveryFees: { type: Number, default: 0 },
      tips: { type: Number, default: 0 },
      totalEarned: { type: Number, default: 0 },
      lastUpdated: Date,
    },
  },
  { timestamps: true },
);

// ✅ Method to add earnings (NEW)
driverSchema.methods.addEarnings = async function (deliveryFee, tip = 0) {
  this.totalEarnings += deliveryFee + tip;
  this.holdBalance += deliveryFee + tip;

  this.earningsBreakdown.deliveryFees += deliveryFee;
  this.earningsBreakdown.tips += tip;
  this.earningsBreakdown.totalEarned += deliveryFee + tip;
  this.earningsBreakdown.lastUpdated = new Date();

  return this.save();
};

// ✅ Method to release hold balance (NEW)
driverSchema.methods.releaseHoldBalance = async function (amount) {
  if (this.holdBalance < amount) {
    throw new Error("Insufficient hold balance");
  }

  this.holdBalance -= amount;
  this.availableBalance += amount;

  return this.save();
};

// ✅ Method to process payout (NEW)
driverSchema.methods.processPayout = async function (amount) {
  if (this.availableBalance < amount) {
    throw new Error("Insufficient available balance");
  }

  this.availableBalance -= amount;
  this.payoutSettings.totalPayouts += amount;
  this.payoutSettings.lastPayoutDate = new Date();

  return this.save();
};

// ✅ Method to check if eligible for payout (NEW)
driverSchema.methods.isEligibleForPayout = function () {
  return (
    this.payoutSettings.autoPayout &&
    this.availableBalance >= this.payoutSettings.minPayoutAmount &&
    (this.payoutSettings.upiId || this.payoutSettings.bankAccount.accountNumber)
  );
};

module.exports = mongoose.model("Driver", driverSchema);
