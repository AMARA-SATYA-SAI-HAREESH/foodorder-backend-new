const mongoose = require("mongoose");

const escrowHoldSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "orders",
      required: true,
      index: true,
    },

    // Vendor hold
    vendor: {
      vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
      },
      restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      commissionRate: {
        type: Number,
        default: 15, // 15% default
      },
    },

    // Driver hold
    driver: {
      driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
      },
      amount: {
        type: Number,
        default: 0,
        min: 0,
      },
      deliveryFee: {
        type: Number,
        default: 0,
      },
      tip: {
        type: Number,
        default: 0,
      },
    },

    // Platform earnings
    platform: {
      vendorCommission: { type: Number, default: 0 },
      deliveryCommission: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    // Hold period
    holdDuration: {
      type: Number,
      default: 24, // 24 hours
      enum: [24, 48, 72], // Can be 24h, 48h, 72h
    },
    holdStart: {
      type: Date,
      default: Date.now,
    },
    holdEnd: {
      type: Date,
      required: true,
      index: true,
    },

    // Status
    status: {
      type: String,
      enum: ["ACTIVE", "RELEASED", "DISPUTED", "CANCELLED"],
      default: "ACTIVE",
    },

    // Dispute info
    dispute: {
      hasDispute: { type: Boolean, default: false },
      disputeId: { type: mongoose.Schema.Types.ObjectId, ref: "Dispute" },
      holdExtendedUntil: Date,
    },

    // Release info
    releasedAt: Date,
    releasedBy: {
      type: String,
      enum: ["SYSTEM", "ADMIN"],
      default: "SYSTEM",
    },
  },
  { timestamps: true },
);

// Index for finding holds due for release
escrowHoldSchema.index({ status: "ACTIVE", holdEnd: 1 });

// Method to check if hold is due for release
escrowHoldSchema.methods.isDueForRelease = function () {
  if (this.status !== "ACTIVE") return false;
  if (this.dispute.hasDispute) return false;
  return new Date() >= this.holdEnd;
};

// Method to calculate hold end time
escrowHoldSchema.statics.calculateHoldEnd = function (hours = 24) {
  const now = new Date();
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
};

module.exports = mongoose.model("EscrowHold", escrowHoldSchema);
