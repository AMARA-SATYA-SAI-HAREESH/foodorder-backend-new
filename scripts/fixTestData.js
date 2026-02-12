// scripts/fixTestData.js - Run this to fix existing data
const mongoose = require("mongoose");
require("dotenv").config();

const fixFoodsWithoutRestaurantId = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const Food = mongoose.model("Food");
  const Restaurant = mongoose.model("Restaurant");

  // Find foods without restaurantId
  const foods = await Food.find({ restaurantId: { $exists: false } });
  console.log(`Found ${foods.length} foods without restaurantId`);

  // Get a default restaurant
  const defaultRestaurant = await Restaurant.findOne({});

  if (!defaultRestaurant) {
    console.log("No restaurants found in database");
    return;
  }

  // Update foods with default restaurantId
  for (const food of foods) {
    food.restaurantId = defaultRestaurant._id;
    await food.save();
    console.log(`Updated food: ${food.title}`);
  }

  console.log("✅ Fixed all foods without restaurantId");
  mongoose.disconnect();
};

fixFoodsWithoutRestaurantId().catch(console.error);
