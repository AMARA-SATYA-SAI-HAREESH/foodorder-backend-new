const mongoose = require("mongoose");

const vendorWithdrawalSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 500,
    },
    method: {
      type: String,
      enum: ["BANK_TRANSFER", "UPI"],
      required: true,
    },
    accountDetails: {
      accountNumber: { type: String },
      accountHolder: { type: String },
      ifscCode: { type: String },
      bankName: { type: String },
      upiId: { type: String },
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "REJECTED", "FAILED"],
      default: "PENDING",
    },
    estimatedProcessing: {
      type: Date,
      default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
    processedAt: { type: Date },
    transactionId: { type: String },
    notes: { type: String },
    rejectionReason: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("VendorWithdrawal", vendorWithdrawalSchema);
