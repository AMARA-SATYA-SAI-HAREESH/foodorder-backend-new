// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema({
//   userName: {
//     type: String,
//     required: [true, "userName is required"],
//   },
//   email: {
//     type: String,
//     required: [true, "email is required"],
//   },
//   password: {
//     type: String,
//     required: [true, "password is required"],
//   },
//   address: {
//     type: String,
//     required: [true, "address is required"],
//   },
//   phone: {
//     type: String,
//     required: [true, "phone required"],
//   },
//   answer: {
//     type: String,
//     required: [true, "answer required"],
//   },
//   userType: {
//     type: String,
//     default: "user",
//     enum: ["admin", "user", "driver", "vendor"],
//   },
//   profile: {
//     type: String,
//     default:
//       "https://static.vecteezy.com/system/resources/previews/024/983/914/large_2x/simple-user-default-icon-free-png.png",
//   },
//   isDriver: { type: Boolean, default: false },
//   isActive: { type: Boolean, default: true },
//   // Driver specific fields (if you want them in User model)
//   driverProfile: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Driver",
//   },
// });

// module.exports = mongoose.model("Users", userSchema);

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, "userName is required"],
    },
    email: {
      type: String,
      required: [true, "email is required"],
    },
    password: {
      type: String,
      required: [true, "password is required"],
    },
    address: {
      type: String,
      required: [true, "address is required"],
    },
    phone: {
      type: String,
      required: [true, "phone required"],
    },
    answer: {
      type: String,
      required: [true, "answer required"],
    },
    userType: {
      type: String,
      default: "user",
      enum: ["admin", "user", "driver", "vendor"],
    },
    profile: {
      type: String,
      default:
        "https://static.vecteezy.com/system/resources/previews/024/983/914/large_2x/simple-user-default-icon-free-png.png",
    },
    isDriver: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    driverProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
    fcmToken: {
      type: String,
      default: null,
    },

    // Notification preferences
    notificationPreferences: {
      pushNotifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
    },
    phone: {
      type: String,
      required: true,
    },
    // Add to userSchema:
    vendorBalance: {
      available: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      totalEarned: { type: Number, default: 0 },
      lastPayoutDate: { type: Date },
    },
    bankAccounts: [
      {
        accountHolder: { type: String },
        accountNumber: { type: String },
        ifscCode: { type: String },
        bankName: { type: String },
        upiId: { type: String },
        isDefault: { type: Boolean, default: false },
        verified: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Users", userSchema);
