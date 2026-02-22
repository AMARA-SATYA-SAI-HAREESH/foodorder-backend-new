const mongoose = require("mongoose");
const categoryModel = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "title is required"],
    },
    imageUrl: {
      type: String,
      default:
        "https://www.kindpng.com/picc/m/492-4927144_classified-search-categories-icon-png-transparent-png.png",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categoryModel);
