const mongoose = require("mongoose");
const orderModel = new mongoose.Schema(
  {
    food: [
      {
        foodId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "foods",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
        },
      },
    ],
    payment: {
      method: {
        type: String,
        enum: ["COD", "CARD", "UPI"],
        default: "COD",
        required: true,
      },
      amount: {
        type: Number,
        required: [true, "Amount is required"],
      },
      transactionId: {
        type: String,
        required: [true, "Transaction ID is required"],
      },
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "Buyer is required"],
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFORMED",
        "PREPARING",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("orders", orderModel);
