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
  },
  { timestamps: true }
);

module.exports = mongoose.mongoose.model("Restaurant", restaurantModel);
