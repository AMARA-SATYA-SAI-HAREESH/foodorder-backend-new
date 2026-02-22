// // const mongoose = require("mongoose");
// // const orderModel = new mongoose.Schema(
// //   {
// //     food: [
// //       {
// //         foodId: {
// //           type: mongoose.Schema.Types.ObjectId,
// //           ref: "foods",
// //           required: true,
// //         },
// //         quantity: {
// //           type: Number,
// //           required: true,
// //           default: 1,
// //         },
// //       },
// //     ],
// //     payment: {
// //       method: {
// //         type: String,
// //         enum: ["COD", "CARD", "UPI"],
// //         default: "COD",
// //         required: true,
// //       },

// //       amount: {
// //         type: Number,
// //         required: [true, "Amount is required"],
// //       },
// //       transactionId: {
// //         type: String,
// //         required: function () {
// //           return this.payment.method !== "COD"; // Required only for non-COD
// //         },
// //       },
// //     },
// //     buyer: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "users",
// //       required: [true, "Buyer is required"],
// //     },
// //     restaurantId: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "Restaurant",
// //       required: true,
// //     },
// //     // NEW: Driver association (for future)
// //     driverId: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "Driver",
// //     },
// //     status: {
// //       type: String,
// //       enum: [
// //         "PENDING",
// //         "CONFIRMED",
// //         "PREPARING",
// //         "OUT_FOR_DELIVERY",
// //         "READY_FOR_PICKUP",
// //         "DELIVERED",
// //         "CANCELLED",
// //       ],
// //       default: "PENDING",
// //     },
// //     // NEW: Vendor-specific status tracking
// //     vendorStatus: {
// //       type: String,
// //       enum: ["PENDING", "ACCEPTED", "PREPARING", "READY", "REJECTED"],
// //       default: "PENDING",
// //     },
// //     // NEW: Special instructions
// //     specialInstructions: {
// //       type: String,
// //       default: "",
// //     },
// //     // NEW: Estimated preparation time
// //     estimatedPrepTime: {
// //       type: Number, // in minutes
// //       default: 30,
// //     },
// //     // Add these fields to orderSchema:
// //     verification: {
// //       pickupCode: { type: String }, // QR code data or 6-digit code
// //       deliveryOTP: { type: String }, // 4-digit OTP for customer
// //       pickupVerifiedAt: { type: Date }, // When driver scanned QR
// //       deliveryVerifiedAt: { type: Date }, // When customer entered OTP
// //       pickupVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
// //     },
// //     estimatedPickupTime: { type: Date }, // When order will be ready
// //     actualPickupTime: { type: Date }, // When driver picked up
// //   },
// //   { timestamps: true }
// // );

// // module.exports = mongoose.model("orders", orderModel);

// const mongoose = require("mongoose");

// const orderModel = new mongoose.Schema(
//   {
//     food: [
//       {
//         foodId: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "foods",
//           required: true,
//         },
//         quantity: {
//           type: Number,
//           required: true,
//           default: 1,
//         },
//       },
//     ],
//     payment: {
//       method: {
//         type: String,
//         enum: ["COD", "CARD", "UPI"],
//         default: "COD",
//         required: true,
//       },
//       amount: {
//         type: Number,
//         required: [true, "Amount is required"],
//       },
//       transactionId: {
//         type: String,
//         required: function () {
//           return this.payment.method !== "COD";
//         },
//       },
//     },
//     buyer: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Users",
//       required: [true, "Buyer is required"],
//     },
//     restaurantId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Restaurant",
//       required: true,
//     },
//     driverId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Driver",
//     },
//     status: {
//       type: String,
//       enum: [
//         "PENDING",
//         "CONFIRMED",
//         "PREPARING",
//         "READY_FOR_PICKUP",
//         "ACCEPTED",
//         "PICKED_UP",
//         "ARRIVED_AT_CUSTOMER",
//         "DELIVERED",
//         "CANCELLED",
//         "ON_THE_WAY"
//       ],
//       default: "PENDING",
//     },
//     vendorStatus: {
//       type: String,
//       enum: ["PENDING", "ACCEPTED", "PREPARING", "READY", "REJECTED"],
//       default: "PENDING",
//     },
//     specialInstructions: {
//       type: String,
//       default: "",
//     },
//     estimatedPrepTime: {
//       type: Number,
//       default: 30,
//     },

//     // ✅ VERIFICATION FIELDS
//     verification: {
//       pickupCode: {
//         type: String,
//         index: true,
//       },
//       deliveryOTP: {
//         type: String,
//       },
//       pickupVerifiedAt: {
//         type: Date,
//       },
//       deliveryVerifiedAt: {
//         type: Date,
//       },
//       pickupVerifiedBy: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Driver",
//       },
//       qrGeneratedAt: {
//         type: Date,
//       },
//       verificationAttempts: {
//         type: Number,
//         default: 0,
//       },
//       lastVerificationAttempt: {
//         type: Date,
//       },
//     },

//     estimatedPickupTime: {
//       type: Date,
//     },
//     actualPickupTime: {
//       type: Date,
//     },
//     actualDeliveryTime: {
//       type: Date,
//     },

//     // Driver status tracking
//     driverStatus: {
//       type: String,
//       enum: [
//         "ASSIGNED",
//         "ARRIVED_AT_RESTAURANT",
//         "PICKED_UP",
//         "EN_ROUTE",
//         "ARRIVED_AT_CUSTOMER",
//         "DELIVERED",
//         "AVAILABLE",
//         "ON_THE_WAY"
//       ],
//       default: "ASSIGNED",
//     },

//     // Tracking
//     timeline: [
//       {
//         status: String,
//         timestamp: { type: Date, default: Date.now },
//         actor: {
//           type: String,
//           enum: ["SYSTEM", "VENDOR", "DRIVER", "CUSTOMER"],
//         },
//         note: String,
//       },
//     ],
//   },
//   { timestamps: true }
// );
// // ✅ CORRECT: Add timeline when status changes
// orderModel.pre("save", function (next) {
//   // This hook runs first
//   if (this.isModified("status")) {
//     if (!this.timeline) {
//       this.timeline = [];
//     }
//     this.timeline.push({
//       status: this.status,
//       timestamp: new Date(),
//       actor: "SYSTEM",
//       note: `Status changed to ${this.status}`,
//     });
//   }

//   // Always call next()
//   if (typeof next === 'function') {
//     next();
//   }
// });

// // ✅ CORRECT: Generate verification codes
// orderModel.pre("save", function (next) {
//   try {
//     // This hook runs second
//     // Only generate codes if status is READY_FOR_PICKUP AND codes don't exist
//     if (this.isModified("status") && this.status === "READY_FOR_PICKUP") {
//       // Check if codes already exist (to avoid regenerating)
//       if (!this.verification || !this.verification.pickupCode) {
//         const shortId = this._id ? this._id.toString().slice(-6).toUpperCase() : "NEWORD";
//         const randomChars = Math.random()
//           .toString(36)
//           .substring(2, 6)
//           .toUpperCase();

//         // Initialize verification object if it doesn't exist
//         if (!this.verification) {
//           this.verification = {};
//         }

//         this.verification.pickupCode = `PICKUP-${shortId}-${randomChars}`;
//         this.verification.deliveryOTP = Math.floor(
//           1000 + Math.random() * 9000
//         ).toString();
//         this.verification.qrGeneratedAt = new Date();
//       }

//       this.estimatedPickupTime = new Date(Date.now() + 30 * 60000);
//       this.vendorStatus = "READY";

//       // Add to timeline
//       if (!this.timeline) {
//         this.timeline = [];
//       }
//       this.timeline.push({
//         status: "READY_FOR_PICKUP",
//         timestamp: new Date(),
//         actor: "VENDOR",
//         note: "Order ready for pickup",
//       });
//     }

//     // Always call next()
//     if (typeof next === 'function') {
//       next();
//     }
//   } catch (error) {
//     // Pass error to next() if it exists
//     if (typeof next === 'function') {
//       next(error);
//     } else {
//       // If next is not a function, re-throw the error
//       throw error;
//     }
//   }
// });

// // ✅ Alternative: Use a single, safer pre-save hook
// // Try replacing BOTH hooks with this SINGLE hook:

// orderModel.pre("save", function (next) {
//   try {
//     // Initialize timeline if it doesn't exist
//     if (!this.timeline) {
//       this.timeline = [];
//     }

//     // Check if status changed
//     if (this.isModified("status")) {
//       // Add status change to timeline
//       this.timeline.push({
//         status: this.status,
//         timestamp: new Date(),
//         actor: "SYSTEM",
//         note: `Status changed to ${this.status}`,
//       });

//       // Handle specific status transitions
//       if (this.status === "READY_FOR_PICKUP") {
//         // Generate verification codes if they don't exist
//         if (!this.verification || !this.verification.pickupCode) {
//           const shortId = this._id ? this._id.toString().slice(-6).toUpperCase() : "NEWORD";
//           const randomChars = Math.random()
//             .toString(36)
//             .substring(2, 6)
//             .toUpperCase();

//           if (!this.verification) {
//             this.verification = {};
//           }

//           this.verification.pickupCode = `PICKUP-${shortId}-${randomChars}`;
//           this.verification.deliveryOTP = Math.floor(
//             1000 + Math.random() * 9000
//           ).toString();
//           this.verification.qrGeneratedAt = new Date();
//         }

//         this.estimatedPickupTime = new Date(Date.now() + 30 * 60000);
//         this.vendorStatus = "READY";

//         // Add vendor-specific timeline entry
//         this.timeline.push({
//           status: "READY_FOR_PICKUP",
//           timestamp: new Date(),
//           actor: "VENDOR",
//           note: "Order ready for pickup with verification codes",
//         });
//       }

//       // Handle driver status mapping
//       if (this.status === "ACCEPTED") {
//         this.driverStatus = "ASSIGNED";
//       } else if (this.status === "PICKED_UP") {
//         this.driverStatus = "PICKED_UP";
//       } else if (this.status === "DELIVERED") {
//         this.driverStatus = "DELIVERED";
//       }
//     }

//     // Safely call next if it exists
//     if (typeof next === 'function') {
//       next();
//     }
//   } catch (error) {
//     // Handle error safely
//     if (typeof next === 'function') {
//       next(error);
//     } else {
//       console.error("Error in pre-save hook:", error);
//       // Don't throw, let save continue
//     }
//   }
// });

// // ✅ Add a method to update status safely
// orderModel.methods.updateStatus = async function (
//   newStatus,
//   actor = "SYSTEM",
//   note = ""
// ) {
//   this.status = newStatus;

//   if (!this.timeline) {
//     this.timeline = [];
//   }

//   this.timeline.push({
//     status: newStatus,
//     timestamp: new Date(),
//     actor: actor,
//     note: note || `Status updated to ${newStatus}`,
//   });

//   return this.save();
// };

// module.exports = mongoose.model("orders", orderModel);

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
        required: function () {
          return this.payment.method !== "COD";
        },
      },
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "Buyer is required"],
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "ACCEPTED",
        "PICKED_UP",
        "ARRIVED_AT_CUSTOMER",
        "DELIVERED",
        "CANCELLED",
        "ON_THE_WAY",
      ],
      default: "PENDING",
    },
    vendorStatus: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "PREPARING", "READY", "REJECTED"],
      default: "PENDING",
    },
    specialInstructions: {
      type: String,
      default: "",
    },
    estimatedPrepTime: {
      type: Number,
      default: 30,
    },

    // ✅ VERIFICATION FIELDS
    verification: {
      pickupCode: {
        type: String,
        index: true,
      },
      deliveryOTP: {
        type: String,
      },
      pickupVerifiedAt: {
        type: Date,
      },
      deliveryVerifiedAt: {
        type: Date,
      },
      pickupVerifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
      },
      qrGeneratedAt: {
        type: Date,
      },
      verificationAttempts: {
        type: Number,
        default: 0,
      },
      lastVerificationAttempt: {
        type: Date,
      },
    },

    estimatedPickupTime: {
      type: Date,
    },
    actualPickupTime: {
      type: Date,
    },
    actualDeliveryTime: {
      type: Date,
    },

    // Driver status tracking
    driverStatus: {
      type: String,
      enum: [
        "ASSIGNED",
        "ARRIVED_AT_RESTAURANT",
        "PICKED_UP",
        "EN_ROUTE",
        "ARRIVED_AT_CUSTOMER",
        "DELIVERED",
        "AVAILABLE",
        "ON_THE_WAY",
      ],
      default: "ASSIGNED",
    },

    // Tracking
    timeline: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        actor: {
          type: String,
          enum: ["SYSTEM", "VENDOR", "DRIVER", "CUSTOMER"],
        },
        note: String,
      },
    ],

    // ✅ AUTO-PAYOUT SYSTEM FIELDS (NEW)
    payoutInfo: {
      vendorAmount: { type: Number, default: 0 },
      driverAmount: { type: Number, default: 0 },
      platformCommission: { type: Number, default: 0 },
      commissionRate: { type: Number, default: 15 }, // 15% default
      holdStart: Date,
      holdEnd: Date,
      holdDuration: { type: Number, default: 24 }, // 24 hours
      status: {
        type: String,
        enum: ["PENDING", "IN_HOLD", "RELEASED", "PAID", "DISPUTED"],
        default: "PENDING",
      },
      escrowHoldId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EscrowHold",
      },
      releasedAt: Date,
      paidAt: Date,
    },

    // Delivery fee and tip (NEW - for driver earnings)
    deliveryFee: {
      type: Number,
      default: 0,
    },
    tip: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// ✅ Single pre-save hook for all logic
orderModel.pre("save", function (next) {
  try {
    // Initialize timeline if it doesn't exist
    if (!this.timeline) {
      this.timeline = [];
    }

    // Check if status changed
    if (this.isModified("status")) {
      // Add status change to timeline
      this.timeline.push({
        status: this.status,
        timestamp: new Date(),
        actor: "SYSTEM",
        note: `Status changed to ${this.status}`,
      });

      // Handle specific status transitions
      if (this.status === "READY_FOR_PICKUP") {
        // Generate verification codes if they don't exist
        if (!this.verification || !this.verification.pickupCode) {
          const shortId = this._id
            ? this._id.toString().slice(-6).toUpperCase()
            : "NEWORD";
          const randomChars = Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase();

          if (!this.verification) {
            this.verification = {};
          }

          this.verification.pickupCode = `PICKUP-${shortId}-${randomChars}`;
          this.verification.deliveryOTP = Math.floor(
            1000 + Math.random() * 9000,
          ).toString();
          this.verification.qrGeneratedAt = new Date();
        }

        this.estimatedPickupTime = new Date(Date.now() + 30 * 60000);
        this.vendorStatus = "READY";

        // Add vendor-specific timeline entry
        this.timeline.push({
          status: "READY_FOR_PICKUP",
          timestamp: new Date(),
          actor: "VENDOR",
          note: "Order ready for pickup with verification codes",
        });
      }

      // Handle driver status mapping
      if (this.status === "ACCEPTED") {
        this.driverStatus = "ASSIGNED";
      } else if (this.status === "PICKED_UP") {
        this.driverStatus = "PICKED_UP";
      } else if (this.status === "DELIVERED") {
        this.driverStatus = "DELIVERED";

        // ✅ AUTO-PAYOUT: Trigger money distribution when order is delivered
        this.payoutInfo.status = "IN_HOLD";
        this.payoutInfo.holdStart = new Date();
        this.payoutInfo.holdEnd = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

        // Add payout timeline entry
        this.timeline.push({
          status: "MONEY_IN_HOLD",
          timestamp: new Date(),
          actor: "SYSTEM",
          note: "Order amount placed in 24-hour escrow hold",
        });
      }
    }

    // Safely call next if it exists
    if (typeof next === "function") {
      next();
    }
  } catch (error) {
    // Handle error safely
    if (typeof next === "function") {
      next(error);
    } else {
      console.error("Error in pre-save hook:", error);
    }
  }
});

// ✅ Add a method to update status safely
orderModel.methods.updateStatus = async function (
  newStatus,
  actor = "SYSTEM",
  note = "",
) {
  this.status = newStatus;

  if (!this.timeline) {
    this.timeline = [];
  }

  this.timeline.push({
    status: newStatus,
    timestamp: new Date(),
    actor: actor,
    note: note || `Status updated to ${newStatus}`,
  });

  return this.save();
};

// ✅ Method to calculate payout amounts (NEW)
orderModel.methods.calculatePayouts = async function () {
  const Restaurant = require("./restaurantModel");
  const restaurant = await Restaurant.findById(this.restaurantId);

  if (!restaurant) {
    throw new Error("Restaurant not found");
  }

  const orderAmount = this.payment.amount;
  const commissionRate = restaurant.commissionRate || 15;
  const commissionAmount = (orderAmount * commissionRate) / 100;

  // Vendor earnings (order amount - commission)
  const vendorAmount = orderAmount - commissionAmount;

  // Driver earnings (delivery fee + tip)
  const driverAmount = (this.deliveryFee || 0) + (this.tip || 0);

  // Platform earnings (commission + delivery fee share)
  const platformCommission = commissionAmount;

  this.payoutInfo = {
    vendorAmount,
    driverAmount,
    platformCommission,
    commissionRate,
    holdStart: new Date(),
    holdEnd: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    holdDuration: 24,
    status: "IN_HOLD",
  };

  return this.save();
};

// ✅ Method to release hold (NEW)
orderModel.methods.releaseHold = async function () {
  if (this.payoutInfo.status !== "IN_HOLD") {
    throw new Error("Payout is not in hold status");
  }

  if (new Date() < this.payoutInfo.holdEnd) {
    throw new Error("Hold period not yet completed");
  }

  this.payoutInfo.status = "RELEASED";
  this.payoutInfo.releasedAt = new Date();

  // Add to timeline
  this.timeline.push({
    status: "MONEY_RELEASED",
    timestamp: new Date(),
    actor: "SYSTEM",
    note: "24-hour hold completed, money available for payout",
  });

  return this.save();
};

module.exports = mongoose.model("orders", orderModel);
