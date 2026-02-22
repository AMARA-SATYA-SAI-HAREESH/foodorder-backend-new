export const generateVerificationData = (orderId) => {
  // Generate random codes
  const pickupCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const deliveryOTP = Math.floor(1000 + Math.random() * 9000).toString();

  return {
    success: true,
    qrString: `ORDER:${orderId}:${pickupCode}:${Date.now()}`,
    verification: {
      pickupCode,
      deliveryOTP,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    },
  };
};
