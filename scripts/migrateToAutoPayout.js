const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const migrateToAutoPayout = async () => {
  console.log("🚀 Starting migration to auto-payout system...");

  // Check if MONGO_DB exists (YOUR variable name)
  const MONGO_DB = process.env.MONGO_DB;

  if (!MONGO_DB) {
    console.error("❌ MONGO_DB not found in .env file!");
    console.log("\n📌 Current .env variables found:");
    console.log(`   - MONGO_DB: ${process.env.MONGO_DB ? "✓" : "✗"}`);
    console.log(`   - PORT: ${process.env.PORT ? "✓" : "✗"}`);
    console.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? "✓" : "✗"}`);
    console.log(
      `   - RAZORPAY_KEY_ID: ${process.env.RAZORPAY_KEY_ID ? "✓" : "✗"}`,
    );
    console.log(`   - FRONTEND_URL: ${process.env.FRONTEND_URL ? "✓" : "✗"}`);
    process.exit(1);
  }

  try {
    console.log(`🔌 Connecting to MongoDB...`);
    await mongoose.connect(MONGO_DB); // Using MONGO_DB not MONGODB_URI
    console.log("✅ Connected to database");

    // Import models AFTER connection is established
    const User = require("../models/userModel");
    const Restaurant = require("../models/restaurantModel");
    const Order = require("../models/orderModel");
    const Driver = require("../models/Driver");
    const PlatformWallet = require("../models/PlatformWallet");
    const UserWallet = require("../models/UserWallet");
    const PayoutRecord = require("../models/PayoutRecord");

    console.log("\n📊 Starting migration...\n");

    // 1. Create PlatformWallet if not exists
    console.log("📦 Step 1: Platform Wallet");
    let platformWallet = await PlatformWallet.findOne();
    if (!platformWallet) {
      platformWallet = await PlatformWallet.create({});
      console.log("   ✅ Created PlatformWallet");
    } else {
      console.log("   ⏩ PlatformWallet already exists");
    }

    // 2. Create UserWallet for all vendors
    console.log("\n👤 Step 2: Vendor Wallets");
    const vendors = await User.find({ userType: "vendor" });
    console.log(`   Found ${vendors.length} vendors`);

    let vendorCount = 0;
    for (const vendor of vendors) {
      let wallet = await UserWallet.findOne({ user: vendor._id });

      if (!wallet) {
        // Get existing balance from old vendorBalance if exists
        const available = vendor.vendorBalance?.available || 0;
        const totalEarned = vendor.vendorBalance?.totalEarned || 0;

        // Get UPI from bank accounts if any
        const defaultAccount = vendor.bankAccounts?.find(
          (acc) => acc.isDefault,
        );
        const upiId = defaultAccount?.upiId || "";

        wallet = await UserWallet.create({
          user: vendor._id,
          userType: "vendor",
          available: available,
          inHold: 0,
          totalEarned: totalEarned,
          payoutSettings: {
            autoPayout: true,
            minAmount: 100,
            method: "UPI",
            destination: {
              upiId: upiId,
              accountHolder: vendor.userName || "",
            },
          },
        });
        vendorCount++;
        console.log(
          `   ✅ Created wallet for vendor: ${vendor.userName || vendor.email}`,
        );
      } else {
        console.log(
          `   ⏩ Wallet already exists for vendor: ${vendor.userName || vendor.email}`,
        );
      }
    }
    console.log(`   ✅ ${vendorCount} new vendor wallets created`);

    // 3. Create UserWallet for all drivers
    console.log("\n🚗 Step 3: Driver Wallets");
    const drivers = await Driver.find().populate("user");
    console.log(`   Found ${drivers.length} drivers`);

    let driverCount = 0;
    for (const driver of drivers) {
      if (driver.user) {
        let wallet = await UserWallet.findOne({ user: driver.user._id });

        if (!wallet) {
          wallet = await UserWallet.create({
            user: driver.user._id,
            userType: "driver",
            available: driver.availableBalance || 0,
            inHold: 0,
            totalEarned: driver.totalEarnings || 0,
            payoutSettings: {
              autoPayout: true,
              minAmount: 100,
              method: "UPI",
              destination: {
                upiId: "",
                accountHolder: driver.user.userName || "",
              },
            },
          });
          driverCount++;
          console.log(
            `   ✅ Created wallet for driver: ${driver.user.userName || driver.user.email}`,
          );
        } else {
          console.log(
            `   ⏩ Wallet already exists for driver: ${driver.user.userName || driver.user.email}`,
          );
        }
      }
    }
    console.log(`   ✅ ${driverCount} new driver wallets created`);

    // 4. Update delivered orders with payout info
    console.log("\n📋 Step 4: Delivered Orders");
    const deliveredOrders = await Order.find({
      status: "DELIVERED",
      $or: [
        { "payoutInfo.status": { $exists: false } },
        { "payoutInfo.status": null },
      ],
    }).limit(100);

    console.log(
      `   Found ${deliveredOrders.length} delivered orders to migrate`,
    );

    let migratedCount = 0;
    for (const order of deliveredOrders) {
      try {
        // Get restaurant for commission rate
        const restaurant = await Restaurant.findById(order.restaurantId);
        if (!restaurant) {
          console.log(
            `   ⚠️ Restaurant not found for order ${order._id}, skipping`,
          );
          continue;
        }

        const commissionRate = restaurant.commissionRate || 15;
        const orderAmount = order.payment.amount;
        const commissionAmount = (orderAmount * commissionRate) / 100;
        const vendorAmount = orderAmount - commissionAmount;

        // Driver amount (delivery fee + tip)
        const driverAmount = (order.deliveryFee || 0) + (order.tip || 0);

        // Set hold end (24 hours from delivery)
        const deliveredTime = order.actualDeliveryTime || order.updatedAt;
        const holdEnd = new Date(deliveredTime.getTime() + 24 * 60 * 60 * 1000);

        // Determine status based on current time
        const status = holdEnd < new Date() ? "RELEASED" : "IN_HOLD";

        order.payoutInfo = {
          vendorAmount,
          driverAmount,
          platformCommission: commissionAmount,
          commissionRate,
          holdStart: deliveredTime,
          holdEnd,
          holdDuration: 24,
          status: status,
          releasedAt: status === "RELEASED" ? holdEnd : null,
        };

        await order.save();
        migratedCount++;

        if (migratedCount % 10 === 0) {
          console.log(`   ✅ Migrated ${migratedCount} orders...`);
        }
      } catch (error) {
        console.error(
          `   ❌ Error migrating order ${order._id}:`,
          error.message,
        );
      }
    }
    console.log(`   ✅ Migrated ${migratedCount} orders`);

    // 5. Summary
    console.log("\n" + "=".repeat(50));
    console.log("🎉 MIGRATION COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(50));
    console.log("\n📊 MIGRATION SUMMARY:");
    console.log(
      `   ✅ Platform Wallet: ${platformWallet ? "Created/Exists" : "Failed"}`,
    );
    console.log(
      `   ✅ Vendor Wallets: ${vendorCount} new, ${vendors.length} total`,
    );
    console.log(
      `   ✅ Driver Wallets: ${driverCount} new, ${drivers.length} total`,
    );
    console.log(`   ✅ Orders Migrated: ${migratedCount}`);

    console.log("\n📌 NEXT STEPS:");
    console.log("   1. Restart your server: npm run dev");
    console.log("   2. Test with a new order: Mark as DELIVERED");
    console.log("   3. Check UserWallet balances in MongoDB");
    console.log("   4. Verify auto-payout cron jobs are running");
  } catch (error) {
    console.error("\n❌ Migration error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from database");
    process.exit(0);
  }
};

// Run migration
migrateToAutoPayout();
