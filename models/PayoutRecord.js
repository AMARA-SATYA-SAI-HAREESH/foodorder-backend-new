const mongoose = require("mongoose");

const payoutRecordSchema = new mongoose.Schema(
  {
    // Batch information
    batchId: {
      type: String,
      required: true,
      index: true,
    },

    // Recipient information
    recipientType: {
      type: String,
      enum: ["VENDOR", "DRIVER"],
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "recipientType",
    },

    // Amount details
    amount: {
      type: Number,
      required: true,
      min: 100, // Minimum ₹100
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Payment method
    method: {
      type: String,
      enum: ["UPI", "BANK_TRANSFER"],
      default: "UPI",
      required: true,
    },

    // Destination details
    destination: {
      upiId: {
        type: String,
        required: function () {
          return this.method === "UPI";
        },
      },
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      accountHolder: String,
    },

    // Status tracking
    status: {
      type: String,
      enum: ["SCHEDULED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"],
      default: "SCHEDULED",
    },

    // External references
    razorpayPayoutId: String,
    razorpayUTR: String,
    razorpayFees: Number,

    // Timeline
    scheduledFor: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,

    // Retry information
    retryCount: {
      type: Number,
      default: 0,
      max: 3,
    },
    lastRetry: Date,
    failureReason: String,

    // Additional information
    notes: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
payoutRecordSchema.index({ recipientId: 1, status: 1 });
payoutRecordSchema.index({ status: 1, scheduledFor: 1 });
payoutRecordSchema.index(
  { razorpayPayoutId: 1 },
  { unique: true, sparse: true },
);
payoutRecordSchema.index({ createdAt: 1 });
payoutRecordSchema.index({ batchId: 1, status: 1 });

// Virtual for formatted status
payoutRecordSchema.virtual("statusText").get(function () {
  const statusMap = {
    SCHEDULED: "Scheduled",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
  };
  return statusMap[this.status] || this.status;
});

// Check if payout can be retried
payoutRecordSchema.methods.canRetry = function () {
  if (this.status !== "FAILED") return false;
  if (this.retryCount >= 3) return false;

  // Wait at least 1 hour before retry
  const lastRetryTime = this.lastRetry || this.updatedAt;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return lastRetryTime < oneHourAgo;
};

// Method to mark as processing
payoutRecordSchema.methods.markAsProcessing = async function (
  razorpayData = {},
) {
  this.status = "PROCESSING";
  this.processedAt = new Date();

  if (razorpayData.payoutId) {
    this.razorpayPayoutId = razorpayData.payoutId;
  }

  await this.save();
};

// Method to mark as completed
payoutRecordSchema.methods.markAsCompleted = async function (
  razorpayData = {},
) {
  this.status = "COMPLETED";
  this.completedAt = new Date();

  if (razorpayData.utr) {
    this.razorpayUTR = razorpayData.utr;
  }
  if (razorpayData.fees) {
    this.razorpayFees = razorpayData.fees;
  }

  await this.save();
};

// Method to mark as failed
payoutRecordSchema.methods.markAsFailed = async function (reason) {
  this.status = "FAILED";
  this.failedAt = new Date();
  this.failureReason = reason;
  this.retryCount += 1;
  this.lastRetry = new Date();

  await this.save();
};

// Static method to find scheduled payouts
payoutRecordSchema.statics.findScheduledPayouts = function (limit = 100) {
  return this.find({
    status: "SCHEDULED",
    scheduledFor: { $lte: new Date() },
  })
    .sort({ scheduledFor: 1 })
    .limit(limit);
};

// Static method to find failed payouts for retry
payoutRecordSchema.statics.findFailedPayoutsForRetry = function (limit = 50) {
  return this.find({
    status: "FAILED",
    retryCount: { $lt: 3 },
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
  })
    .sort({ createdAt: 1 })
    .limit(limit);
};

// Static method to generate batch ID
payoutRecordSchema.statics.generateBatchId = function () {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 6);
  return `BATCH_${timestamp}_${random}`.toUpperCase();
};

module.exports = mongoose.model("PayoutRecord", payoutRecordSchema);
