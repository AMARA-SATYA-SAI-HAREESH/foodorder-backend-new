const axios = require("axios");
const crypto = require("crypto");

class PayoutUtils {
  constructor() {
    this.razorpayKey = process.env.RAZORPAY_KEY_ID;
    this.razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    this.baseURL = "https://api.razorpay.com/v1";
  }

  // Generate unique batch ID
  generateBatchId(prefix = "PYT") {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6);
    return `${prefix}_${timestamp}_${random}`.toUpperCase();
  }

  // Create Razorpay payout
  async createRazorpayPayout(payoutData) {
    try {
      const auth = Buffer.from(
        `${this.razorpayKey}:${this.razorpaySecret}`,
      ).toString("base64");

      const payload = {
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        fund_account_id: payoutData.fundAccountId, // Should be created beforehand
        amount: payoutData.amount * 100, // Convert to paise
        currency: "INR",
        mode: payoutData.mode || "UPI",
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: payoutData.referenceId,
        narration: payoutData.narration || "Food delivery payout",
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
        fees: response.data.fees / 100, // Convert to rupees
        status: response.data.status,
      };
    } catch (error) {
      console.error(
        "Razorpay payout error:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error: error.response?.data?.error?.description || error.message,
        code: error.response?.data?.error?.code,
      };
    }
  }

  // Create fund account for UPI
  async createUPIFundAccount(contactId, upiId, name) {
    try {
      const auth = Buffer.from(
        `${this.razorpayKey}:${this.razorpaySecret}`,
      ).toString("base64");

      const payload = {
        contact_id: contactId,
        account_type: "vpa",
        vpa: {
          address: upiId,
        },
      };

      const response = await axios.post(
        `${this.baseURL}/fund_accounts`,
        payload,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        success: true,
        fundAccountId: response.data.id,
      };
    } catch (error) {
      console.error(
        "Create fund account error:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error: error.response?.data?.error?.description || error.message,
      };
    }
  }

  // Verify UPI ID
  async verifyUPI(upiId) {
    // Simple validation
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(upiId)) {
      return { valid: false, reason: "Invalid UPI format" };
    }

    // Could add additional validation with NPCI API if needed
    return { valid: true };
  }

  // Calculate platform fee for payout
  calculatePayoutFee(amount) {
    // Razorpay charges: ₹5 + GST for UPI, ₹10 + GST for bank transfer
    // We'll absorb small fees, charge for large amounts
    if (amount <= 1000) return 0; // Free for small payouts
    if (amount <= 5000) return 5; // ₹5 for medium
    return 10; // ₹10 for large
  }

  // Generate payout report
  generatePayoutReport(payouts) {
    const summary = {
      totalAmount: 0,
      totalFees: 0,
      successCount: 0,
      failedCount: 0,
      byMethod: {},
      byRecipientType: {},
    };

    payouts.forEach((payout) => {
      summary.totalAmount += payout.amount;
      summary.totalFees += payout.fees || 0;

      if (payout.status === "COMPLETED") {
        summary.successCount++;
      } else if (payout.status === "FAILED") {
        summary.failedCount++;
      }

      // Count by method
      summary.byMethod[payout.method] =
        (summary.byMethod[payout.method] || 0) + 1;

      // Count by recipient
      summary.byRecipientType[payout.recipientType] =
        (summary.byRecipientType[payout.recipientType] || 0) + 1;
    });

    return summary;
  }

  // Validate bank account details
  validateBankAccount(account) {
    const errors = [];

    if (!account.accountHolder || account.accountHolder.trim().length < 2) {
      errors.push("Account holder name is required");
    }

    if (!account.accountNumber || !/^\d{9,18}$/.test(account.accountNumber)) {
      errors.push("Account number must be 9-18 digits");
    }

    if (!account.ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(account.ifscCode)) {
      errors.push("Invalid IFSC code format");
    }

    if (!account.bankName || account.bankName.trim().length < 2) {
      errors.push("Bank name is required");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Calculate next payout time
  getNextPayoutTime() {
    const now = new Date();
    const payoutTime = new Date(now);

    // Set to next 2 AM
    payoutTime.setHours(2, 0, 0, 0);

    // If already past 2 AM today, set to tomorrow
    if (now > payoutTime) {
      payoutTime.setDate(payoutTime.getDate() + 1);
    }

    return payoutTime;
  }

  // Format time remaining
  formatTimeRemaining(targetTime) {
    const now = new Date();
    const diff = targetTime - now;

    if (diff <= 0) return "Processing";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    }
    return `in ${minutes}m`;
  }
}

module.exports = new PayoutUtils();
