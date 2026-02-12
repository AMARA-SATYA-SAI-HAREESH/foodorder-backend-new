const axios = require("axios");

class PayoutProcessor {
  constructor() {
    this.razorpayKey = process.env.RAZORPAY_KEY_ID;
    this.razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    this.baseURL = "https://api.razorpay.com/v1";
  }

  // Process payout
  async processPayout(payoutRecord, isRetry = false) {
    try {
      // Validate payout record
      if (!this.validatePayout(payoutRecord)) {
        return {
          success: false,
          error: "Invalid payout record",
        };
      }

      let result;
      if (payoutRecord.method === "UPI") {
        result = await this.processUPIPayout(payoutRecord);
      } else if (payoutRecord.method === "BANK_TRANSFER") {
        result = await this.processBankPayout(payoutRecord);
      } else {
        return {
          success: false,
          error: "Unsupported payout method",
        };
      }

      // Update payout record
      if (result.success) {
        payoutRecord.status = "PROCESSING";
        payoutRecord.externalId = result.payoutId;
        payoutRecord.utr = result.utr;

        // Schedule status check
        setTimeout(
          () => {
            this.checkPayoutStatus(payoutRecord._id);
          },
          5 * 60 * 1000,
        );
      }

      return result;
    } catch (error) {
      console.error("Payout processing error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Process UPI payout
  async processUPIPayout(payoutRecord) {
    try {
      const auth = Buffer.from(
        `${this.razorpayKey}:${this.razorpaySecret}`,
      ).toString("base64");

      // For UPI, we need to create/use a fund account
      const fundAccountId = await this.getOrCreateFundAccount(
        payoutRecord.recipientId,
        payoutRecord.destination,
      );

      const payload = {
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        fund_account_id: fundAccountId,
        amount: payoutRecord.netAmount * 100, // Convert to paise
        currency: "INR",
        mode: "UPI",
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: `PYT_${payoutRecord._id}`,
        narration: `${payoutRecord.recipientType} payout`,
      };

      const response = await axios.post(`${this.baseURL}/payouts`, payload, {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      });

      return {
        success: true,
        payoutId: response.data.id,
        utr: response.data.utr,
        status: response.data.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.description || error.message,
      };
    }
  }

  // Process bank payout
  async processBankPayout(payoutRecord) {
    try {
      const auth = Buffer.from(
        `${this.razorpayKey}:${this.razorpaySecret}`,
      ).toString("base64");

      const payload = {
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        fund_account_id: await this.getOrCreateFundAccount(
          payoutRecord.recipientId,
          payoutRecord.destination,
        ),
        amount: payoutRecord.netAmount * 100,
        currency: "INR",
        mode: "IMPS",
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: `PYT_${payoutRecord._id}`,
        narration: `${payoutRecord.recipientType} payout`,
      };

      const response = await axios.post(`${this.baseURL}/payouts`, payload, {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      });

      return {
        success: true,
        payoutId: response.data.id,
        utr: response.data.utr,
        status: response.data.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.description || error.message,
      };
    }
  }

  // Check payout status
  async checkPayoutStatus(payoutRecordId) {
    try {
      const PayoutRecord = require("../models/PayoutRecord");
      const payout = await PayoutRecord.findById(payoutRecordId);

      if (!payout || !payout.externalId) {
        return;
      }

      const auth = Buffer.from(
        `${this.razorpayKey}:${this.razorpaySecret}`,
      ).toString("base64");

      const response = await axios.get(
        `${this.baseURL}/payouts/${payout.externalId}`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        },
      );

      if (response.data.status === "processed") {
        payout.status = "COMPLETED";
        payout.completedAt = new Date();
        await payout.save();
      } else if (response.data.status === "failed") {
        payout.status = "FAILED";
        payout.failureReason = response.data.failure_reason;
        await payout.save();
      }
    } catch (error) {
      console.error("Error checking payout status:", error);
    }
  }

  // Get or create fund account
  async getOrCreateFundAccount(userId, destination) {
    // In a real implementation, you would:
    // 1. Check if fund account exists for this user
    // 2. Create if doesn't exist
    // 3. Return fund account ID

    // For now, generate a mock ID
    // In production, implement actual Razorpay fund account API
    return `fa_${userId}_${Date.now()}`;
  }

  // Validate payout
  validatePayout(payoutRecord) {
    if (!payoutRecord.amount || payoutRecord.amount < 100) {
      return false;
    }

    if (payoutRecord.method === "UPI") {
      if (!payoutRecord.destination?.upiId) {
        return false;
      }
      return this.validateUPI(payoutRecord.destination.upiId).valid;
    }

    if (payoutRecord.method === "BANK_TRANSFER") {
      if (
        !payoutRecord.destination?.accountNumber ||
        !payoutRecord.destination?.ifscCode
      ) {
        return false;
      }
      return true;
    }

    return false;
  }

  // Validate UPI ID
  validateUPI(upiId) {
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    const isValid = upiRegex.test(upiId);

    return {
      valid: isValid,
      message: isValid ? "Valid UPI ID" : "Invalid UPI format",
    };
  }

  // Validate bank details
  validateBankDetails(details) {
    const errors = [];

    if (!details.accountHolder || details.accountHolder.trim().length < 2) {
      errors.push("Account holder name is required");
    }

    if (!details.accountNumber || !/^\d{9,18}$/.test(details.accountNumber)) {
      errors.push("Account number must be 9-18 digits");
    }

    if (!details.ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(details.ifscCode)) {
      errors.push("Invalid IFSC code format");
    }

    if (!details.bankName || details.bankName.trim().length < 2) {
      errors.push("Bank name is required");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Calculate platform fee
  calculatePlatformFee(amount) {
    if (amount <= 1000) return 0; // Free for small amounts
    if (amount <= 5000) return 5; // ₹5 for medium amounts
    return 10; // ₹10 for large amounts
  }
}

module.exports = new PayoutProcessor();
