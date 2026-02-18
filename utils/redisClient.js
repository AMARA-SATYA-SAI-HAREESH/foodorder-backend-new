const redis = require("redis");
require("dotenv").config(); // Add this at the top if not already loaded

console.log("🔍 ENV CHECK:");
console.log("- REDIS_URL exists:", !!process.env.REDIS_URL);
console.log(
  "- REDIS_URL prefix:",
  process.env.REDIS_URL?.substring(0, 20) + "...",
);
console.log("- NODE_ENV:", process.env.NODE_ENV);

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Error Details:", {
    message: err.message,
    code: err.code,
    syscall: err.syscall,
    address: err.address,
    port: err.port,
  });
});

redisClient.on("connect", () => console.log("✅ Redis connected"));

(async () => {
  try {
    await redisClient.connect();
    console.log("✅ Redis connection established");

    // Test the connection
    await redisClient.set("test-key", "working");
    const test = await redisClient.get("test-key");
    console.log("✅ Redis read/write test:", test);
  } catch (err) {
    console.error("❌ Redis connection failed:", err.message);
    console.error("Full error:", err);
  }
})();

module.exports = redisClient;
