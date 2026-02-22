const redisClient = require("../utils/redisClient");

// Cache GET requests
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;

    try {
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        console.log(`🔵 CACHE HIT: ${req.originalUrl}`);
        return res.json(JSON.parse(cachedData));
      }

      console.log(`🟢 CACHE MISS: ${req.originalUrl}`);

      // Store original send function
      const originalJson = res.json;

      res.json = function (data) {
        // Cache the response
        redisClient
          .setEx(key, duration, JSON.stringify(data))
          .catch((err) => console.error("Cache set error:", err));
        originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error("Cache error:", error);
      next();
    }
  };
};

// Clear cache for specific patterns
const clearCache = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(
        `🗑️ Cleared cache for pattern: ${pattern} (${keys.length} keys)`,
      );
    }
  } catch (error) {
    console.error("Clear cache error:", error);
  }
};

module.exports = { cacheMiddleware, clearCache };
