// const mongoose = require("mongoose");

// const driverEarningSchema = new mongoose.Schema(
//   {
//     driver: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Driver",
//       required: true,
//     },
//     order: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "orders",
//       required: true,
//     },

//     // Order details
//     orderAmount: { type: Number, required: true },
//     deliveryFee: { type: Number, default: 0 },
//     tip: { type: Number, default: 0 },

//     // Earnings breakdown
//     platformCommission: { type: Number, default: 0 },
//     driverEarnings: { type: Number, required: true }, // Final amount to driver
//     status: {
//       type: String,
//       enum: ["PENDING", "IN_HOLD", "AVAILABLE", "PAID"],
//       default: "PENDING",
//     },

//     // Timing
//     completedAt: { type: Date, required: true },
//     holdReleaseAt: Date,
//     paidAt: Date,

//     // Additional info
//     distance: { type: Number },
//     deliveryTime: { type: Number },
//     rating: { type: Number, min: 1, max: 5 },
//   },
//   { timestamps: true },
// );

// // Indexes
// driverEarningSchema.index({ driver: 1, status: 1 });
// driverEarningSchema.index({ order: 1 }, { unique: true });
// driverEarningSchema.index({ holdReleaseAt: 1 });

// module.exports = mongoose.model("DriverEarning", driverEarningSchema);

const mongoose = require("mongoose");

const driverEarningSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "orders",
      required: true,
    },

    // Order details
    orderAmount: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    tip: { type: Number, default: 0 },

    // Earnings breakdown
    platformCommission: { type: Number, default: 0 },
    driverEarnings: { type: Number, required: true }, // Final amount to driver
    status: {
      type: String,
      enum: ["PENDING", "IN_HOLD", "AVAILABLE", "PAID", "CANCELLED"],
      default: "PENDING",
    },

    // Timing
    completedAt: { type: Date, required: true },
    holdReleaseAt: Date,
    paidAt: Date,

    // ✅ AUTO-PAYOUT SYSTEM FIELDS (NEW)
    holdDuration: {
      type: Number,
      default: 24, // 24 hours
    },
    escrowHoldId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EscrowHold",
    },
    payoutRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayoutRecord",
    },

    // Additional info
    distance: { type: Number },
    deliveryTime: { type: Number },
    rating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true },
);

// Indexes
driverEarningSchema.index({ driver: 1, status: 1 });
driverEarningSchema.index({ order: 1 }, { unique: true });
driverEarningSchema.index({ holdReleaseAt: 1 });
driverEarningSchema.index({ completedAt: 1 });

// ✅ Method to check if hold is due for release (NEW)
driverEarningSchema.methods.isHoldDueForRelease = function () {
  if (this.status !== "IN_HOLD") return false;
  if (!this.holdReleaseAt) return false;
  return new Date() >= this.holdReleaseAt;
};

// ✅ Method to release from hold (NEW)
driverEarningSchema.methods.releaseFromHold = async function () {
  if (this.status !== "IN_HOLD") {
    throw new Error("Earnings not in hold status");
  }

  if (!this.isHoldDueForRelease()) {
    throw new Error("Hold period not yet completed");
  }

  this.status = "AVAILABLE";
  this.holdReleaseAt = new Date();

  return this.save();
};

// ✅ Method to mark as paid (NEW)
driverEarningSchema.methods.markAsPaid = async function (payoutRecordId) {
  this.status = "PAID";
  this.paidAt = new Date();
  this.payoutRecordId = payoutRecordId;

  return this.save();
};

// ✅ Static method to find due earnings for release (NEW)
driverEarningSchema.statics.findDueForRelease = function (limit = 100) {
  const now = new Date();
  return this.find({
    status: "IN_HOLD",
    holdReleaseAt: { $lte: now },
  })
    .sort({ holdReleaseAt: 1 })
    .limit(limit);
};

// ✅ Static method to find available earnings for payout (NEW)
driverEarningSchema.statics.findAvailableForPayout = function (
  driverId,
  limit = 50,
) {
  return this.find({
    driver: driverId,
    status: "AVAILABLE",
  })
    .sort({ completedAt: 1 })
    .limit(limit);
};

module.exports = mongoose.model("DriverEarning", driverEarningSchema);
