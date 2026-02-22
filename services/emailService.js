const { Resend } = require("resend");

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Test the connection
const testConnection = async () => {
  try {
    // Simple API call to verify key works
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev", // Default test sender
      to: "delivered@resend.dev", // Resend's test inbox
      subject: "Test Connection",
      html: "<p>Testing Resend connection</p>",
    });

    if (error) {
      console.log("❌ Email service error:", error);
    } else {
      console.log("✅ Email service is ready to send messages");
    }
  } catch (error) {
    console.log("❌ Email service error:", error);
  }
};

// Call test on startup
testConnection();

// In your sendOTPEmail function, temporarily override the recipient
exports.sendOTPEmail = async (email, otp) => {
  try {
    // FOR TESTING: Always send to your verified email
    const testEmail = "foodmartservicehelper@gmail.com"; // Your verified email

    const { data, error } = await resend.emails.send({
      from: "Food Order App <onboarding@resend.dev>",
      to: testEmail, // Send to your email instead of user's email
      subject: `OTP for ${email} - Food Order App`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #f97316;">Food Order App</h1>
          </div>
          <h2 style="color: #333;">Email Verification</h2>
          <p>User <strong>${email}</strong> requested OTP:</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="font-size: 36px; letter-spacing: 8px; color: #f97316; margin: 0;">${otp}</h1>
          </div>
          <p>This OTP will expire in <strong>10 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">© 2024 Food Order App. All rights reserved.</p>
        </div>
      `,
    });

    if (error) throw error;
    console.log(`✅ OTP for ${email} sent to test inbox:`, data.id);
    return true;
  } catch (error) {
    console.error("❌ Error sending OTP email:", error);
    throw error;
  }
};
