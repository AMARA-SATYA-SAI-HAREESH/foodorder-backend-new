const axios = require("axios");

class NotificationService {
  constructor() {
    // Initialize any notification services here
    this.services = {
      push: this.sendPushNotification,
      sms: this.sendSMS,
      email: this.sendEmail,
      whatsapp: this.sendWhatsApp,
    };
  }

  /**
   * Send notification to driver
   */
  async notifyDriver(driverId, orderId, type = "NEW_ORDER") {
    try {
      const messages = {
        NEW_ORDER: {
          title: "🎯 New Order Available!",
          body: "A new delivery order is available near you. Tap to view details.",
          data: { orderId, type: "NEW_ORDER" },
        },
        ORDER_ACCEPTED: {
          title: "✅ Order Accepted",
          body: "Restaurant is preparing your order. Head to the restaurant soon.",
          data: { orderId, type: "ORDER_ACCEPTED" },
        },
        ORDER_READY: {
          title: "📦 Order Ready for Pickup",
          body: "Order is ready! Please proceed to the restaurant for pickup.",
          data: { orderId, type: "ORDER_READY" },
        },
        ORDER_PICKED_UP: {
          title: "🚚 Order Picked Up",
          body: "Driver has picked up your order. Track delivery in real-time.",
          data: { orderId, type: "ORDER_PICKED_UP" },
        },
        ORDER_DELIVERED: {
          title: "✅ Order Delivered",
          body: "Your order has been delivered successfully. Thank you!",
          data: { orderId, type: "ORDER_DELIVERED" },
        },
        EARNINGS_UPDATED: {
          title: "💰 Earnings Updated",
          body: "Your earnings have been updated. Check your dashboard.",
          data: { type: "EARNINGS_UPDATED" },
        },
      };

      const message = messages[type] || messages.NEW_ORDER;

      // In a real app, you would:
      // 1. Get driver's device tokens from database
      // 2. Send push notification using FCM/APNS
      // 3. Send SMS/WhatsApp if enabled

      console.log(`[NOTIFICATION] Sending to driver ${driverId}:`, message);

      // For now, just log
      return { success: true, message: "Notification queued" };
    } catch (error) {
      console.error("Notification error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to customer
   */
  async notifyCustomer(customerId, orderId, type = "ORDER_CONFIRMED") {
    try {
      const messages = {
        ORDER_CONFIRMED: {
          title: "✅ Order Confirmed",
          body: "Your order has been confirmed and is being prepared.",
          data: { orderId, type: "ORDER_CONFIRMED" },
        },
        ORDER_ACCEPTED: {
          title: "👨‍🍳 Order Accepted",
          body: "Restaurant has accepted your order. Preparation started.",
          data: { orderId, type: "ORDER_ACCEPTED" },
        },
        DRIVER_ASSIGNED: {
          title: "🚗 Driver Assigned",
          body: "A driver has been assigned to your order. Track in real-time.",
          data: { orderId, type: "DRIVER_ASSIGNED" },
        },
        ORDER_PICKED_UP: {
          title: "📦 Order Picked Up",
          body: "Your order has been picked up and is on the way!",
          data: { orderId, type: "ORDER_PICKED_UP" },
        },
        ORDER_DELIVERED: {
          title: "✅ Order Delivered",
          body: "Your order has been delivered. Enjoy your meal!",
          data: { orderId, type: "ORDER_DELIVERED" },
        },
      };

      const message = messages[type] || messages.ORDER_CONFIRMED;

      console.log(`[NOTIFICATION] Sending to customer ${customerId}:`, message);

      return { success: true, message: "Notification queued" };
    } catch (error) {
      console.error("Notification error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to restaurant
   */
  async notifyRestaurant(restaurantId, orderId, type = "NEW_ORDER") {
    try {
      const messages = {
        NEW_ORDER: {
          title: "🆕 New Order Received",
          body: "You have received a new order. Please accept or reject.",
          data: { orderId, type: "NEW_ORDER" },
        },
        ORDER_ACCEPTED: {
          title: "✅ Order Accepted",
          body: "Driver has accepted the order. Prepare for pickup.",
          data: { orderId, type: "ORDER_ACCEPTED" },
        },
        DRIVER_ARRIVED: {
          title: "🚗 Driver Arrived",
          body: "Driver has arrived for pickup. Hand over the order.",
          data: { orderId, type: "DRIVER_ARRIVED" },
        },
      };

      const message = messages[type] || messages.NEW_ORDER;

      console.log(
        `[NOTIFICATION] Sending to restaurant ${restaurantId}:`,
        message
      );

      return { success: true, message: "Notification queued" };
    } catch (error) {
      console.error("Notification error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS (placeholder for actual SMS service)
   */
  async sendSMS(phone, message) {
    // Integration with SMS service like Twilio, MSG91, etc.
    console.log(`[SMS] To ${phone}: ${message}`);
    return { success: true };
  }

  /**
   * Send Email (placeholder)
   */
  async sendEmail(email, subject, body) {
    // Integration with email service
    console.log(`[EMAIL] To ${email}: ${subject}`);
    return { success: true };
  }

  /**
   * Send WhatsApp (placeholder)
   */
  async sendWhatsApp(phone, message) {
    // Integration with WhatsApp Business API
    console.log(`[WHATSAPP] To ${phone}: ${message}`);
    return { success: true };
  }

  /**
   * Send Push Notification (placeholder)
   */
  async sendPushNotification(deviceTokens, message) {
    // Integration with FCM (Firebase Cloud Messaging)
    console.log(`[PUSH] To devices:`, deviceTokens);
    console.log(`Message:`, message);
    return { success: true };
  }
}

module.exports = new NotificationService();
