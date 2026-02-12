const mongoose = require("mongoose");
const User = require("../models/userModel");
const Driver = require("../models/Driver");
const PlatformWallet = require("../models/PlatformWallet");

class BalanceLock {
  // Lock key for redis (if using) or in-memory locks
  static locks = new Map();

  // Get lock for user balance update
  static async acquireLock(userId, type = "user") {
    const lockKey = `${type}:${userId}`;

    // Check if already locked (simple in-memory lock)
    if (this.locks.has(lockKey)) {
      const lock = this.locks.get(lockKey);
      if (Date.now() - lock.timestamp < 30000) {
        // 30 second lock expiry
        throw new Error("Balance update in progress. Please try again.");
      }
    }

    // Acquire lock
    this.locks.set(lockKey, {
      timestamp: Date.now(),
      type,
    });

    return lockKey;
  }

  // Release lock
  static releaseLock(lockKey) {
    this.locks.delete(lockKey);
  }

  // Update user balance with transaction safety
  static async updateUserBalance(userId, updates, session = null) {
    const lockKey = await this.acquireLock(userId, "user");

    try {
      const updateOps = {};

      // Build update operations
      if (updates.available !== undefined) {
        updateOps["wallet.available"] = updates.available;
      }
      if (updates.holdBalance !== undefined) {
        updateOps["wallet.holdBalance"] = updates.holdBalance;
      }
      if (updates.pending !== undefined) {
        updateOps["wallet.pending"] = updates.pending;
      }
      if (updates.totalEarned !== undefined) {
        updateOps["wallet.totalEarned"] = updates.totalEarned;
      }

      // Update with session for transaction
      const options = session ? { session } : {};
      const result = await User.findByIdAndUpdate(
        userId,
        { $set: updateOps },
        { new: true, ...options },
      );

      if (!result) {
        throw new Error("User not found");
      }

      return result;
    } catch (error) {
      throw error;
    } finally {
      this.releaseLock(lockKey);
    }
  }

  // Update driver balance
  static async updateDriverBalance(driverId, updates, session = null) {
    const lockKey = await this.acquireLock(driverId, "driver");

    try {
      const updateOps = {};

      if (updates.availableBalance !== undefined) {
        updateOps.availableBalance = updates.availableBalance;
      }
      if (updates.pendingBalance !== undefined) {
        updateOps.pendingBalance = updates.pendingBalance;
      }
      if (updates.totalEarnings !== undefined) {
        updateOps.totalEarnings = updates.totalEarnings;
      }
      if (updates.holdBalance !== undefined) {
        updateOps.holdBalance = updates.holdBalance;
      }

      const options = session ? { session } : {};
      const result = await Driver.findByIdAndUpdate(
        driverId,
        { $set: updateOps },
        { new: true, ...options },
      );

      if (!result) {
        throw new Error("Driver not found");
      }

      return result;
    } catch (error) {
      throw error;
    } finally {
      this.releaseLock(lockKey);
    }
  }

  // Platform wallet update with transaction
  static async updatePlatformWallet(updates, session = null) {
    const lockKey = await this.acquireLock("platform", "platform");

    try {
      const wallet = await PlatformWallet.getWallet();
      const updateOps = {};

      // Build updates
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value === "object") {
          for (const [subKey, subValue] of Object.entries(value)) {
            updateOps[`${key}.${subKey}`] = subValue;
          }
        } else {
          updateOps[key] = value;
        }
      }

      const options = session ? { session } : {};
      const result = await PlatformWallet.findByIdAndUpdate(
        wallet._id,
        { $set: updateOps },
        { new: true, ...options },
      );

      return result;
    } catch (error) {
      throw error;
    } finally {
      this.releaseLock(lockKey);
    }
  }

  // Batch update multiple balances in transaction
  static async batchUpdate(updates) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const results = {};

      // Process each update in transaction
      for (const update of updates) {
        if (update.type === "user") {
          results[update.userId] = await this.updateUserBalance(
            update.userId,
            update.updates,
            session,
          );
        } else if (update.type === "driver") {
          results[update.driverId] = await this.updateDriverBalance(
            update.driverId,
            update.updates,
            session,
          );
        } else if (update.type === "platform") {
          results.platform = await this.updatePlatformWallet(
            update.updates,
            session,
          );
        }
      }

      await session.commitTransaction();
      return results;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Check if user has sufficient balance
  static async checkSufficientBalance(
    userId,
    amount,
    balanceType = "available",
  ) {
    const user = await User.findById(userId).select("wallet");

    if (!user) {
      throw new Error("User not found");
    }

    const balance = user.wallet[balanceType] || 0;

    if (balance < amount) {
      throw new Error(
        `Insufficient ${balanceType} balance. Required: ${amount}, Available: ${balance}`,
      );
    }

    return true;
  }

  // Transfer from hold to available after 24h
  static async releaseHoldBalance(userId, amount, session = null) {
    return await this.updateUserBalance(
      userId,
      {
        holdBalance: -amount,
        available: amount,
      },
      session,
    );
  }

  // Cleanup expired locks (call this periodically)
  static cleanupExpiredLocks() {
    const now = Date.now();
    for (const [key, lock] of this.locks.entries()) {
      if (now - lock.timestamp > 30000) {
        // 30 seconds expiry
        this.locks.delete(key);
      }
    }
  }
}

module.exports = BalanceLock;
