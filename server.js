// const express = require("express");
// const dotenv = require("dotenv");
// const cors = require("cors");
// const helmet = require("helmet");
// const mongoSanitize = require("express-mongo-sanitize");
// const xss = require("xss-clean");
// const configDB = require("./config/configDb");
// const http = require("http");
// // const { initSocket } = require("./config/socket");
// // const testSocketRoutes = require("./routes/testSocketRoutes");

// const session = require("express-session");
// const { RedisStore } = require("connect-redis");
// const redisClient = require("./utils/redisClient");
// const uploadRoutes = require("./routes/uploadRoutes");

// dotenv.config();

// // all vendor imports
// const vendorAuthRoutes = require("./routes/vendorAuthRoutes");
// const vendorRestaurantRoutes = require("./routes/vendorRestaurantRoutes");
// const vendorFoodRoutes = require("./routes/vendorFoodRoutes");
// const vendorOrderRoutes = require("./routes/vendorOrderRoutes");
// const razorpayRoutes = require("./routes/razorpayRoutes");
// // Driver imports
// const driverAuthRoutes = require("./routes/driverAuthRoutes");
// const driverRoutes = require("./routes/driverRoutes");
// const verificationRoutes = require("./routes/verificationRoutes");

// // Auth middleware
// const { authMiddleware } = require("./middlewares/authMiddleware");
// const { adminMiddleware } = require("./middlewares/adminMiddleware");
// const otpRoutes = require("./routes/otpRoutes");

// const app = express();
// configDB();
// const server = http.createServer(app);

// // Initialize Socket.io
// // const io = initSocket(server);
// // app.set("io", io);

// // ========== CORS CONFIGURATION ==========
// const corsOptions = {
//   origin: [
//     "http://localhost:3000",
//     "https://foodorder-frontend-indol.vercel.app",
//     process.env.CORS_ORIGIN || "https://foodorder-frontend-indol.vercel.app",
//   ],
//   credentials: true,
//   optionsSuccessStatus: 200,
//   methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
// };

// app.use(cors(corsOptions));

// // ✅ FIXED ORDER - Parse first, then sanitize
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// // ========== SECURITY MIDDLEWARE ==========
// // ✅ FIXED mongoSanitize - Create a copy instead of modifying
// app.use((req, res, next) => {
//   // Create a safe copy for sanitization
//   if (req.query && typeof req.query === "object") {
//     // Use sanitize function on a copy
//     const sanitizedQuery = JSON.parse(JSON.stringify(req.query));
//     // Apply to request object in a safe way
//     Object.defineProperty(req, "query", {
//       value: sanitizedQuery,
//       writable: true,
//       configurable: true,
//     });
//   }

//   // Now apply mongoSanitize
//   mongoSanitize()(req, res, (err) => {
//     if (err) return next(err);
//     next();
//   });
// });

// app.use(xss());
// app.use(helmet());

// app.use((req, res, next) => {
//   console.log(
//     `📡 ${req.method} ${req.url} - Origin: ${req.headers.origin || "No origin"}`,
//   );
//   next();
// });

// app.use("/uploads", express.static("uploads"));

// // ========== SESSION MIDDLEWARE ==========
// app.use(
//   session({
//     store: new RedisStore({
//       client: redisClient,
//       prefix: "session:",
//     }),
//     secret: process.env.SESSION_SECRET || "your-secret-key",
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       secure: process.env.NODE_ENV === "production",
//       httpOnly: true,
//       maxAge: 24 * 60 * 60 * 1000, // 24 hours
//     },
//   }),
// );

// console.log("✅ Redis session store initialized");

// // ========== TEST ROUTES ==========
// // app.use("/api/test", testSocketRoutes);
// app.get("/api/test-simple", (req, res) => {
//   res.json({
//     success: true,
//     message: "Simple test route works!",
//   });
// });

// // ========== USER & RESTAURANT ROUTES ==========
// app.use("/user", require("./routes/userRoutes"));
// app.use("/restaurant", require("./routes/restaurantRoutes"));
// app.use("/catogary", require("./routes/categoryRoutes"));
// app.use("/api/food", require("./routes/foodRoutes"));
// app.use("/api/order", require("./routes/orderRoutes"));

// // ========== VENDOR ROUTES ==========
// app.use("/api/vendor/auth", vendorAuthRoutes);
// app.use("/api/vendor/restaurant", vendorRestaurantRoutes);
// app.use("/api/vendor/foods", vendorFoodRoutes);
// app.use("/api/vendor/orders", vendorOrderRoutes);
// app.use("/api/otp", otpRoutes);

// // ========== RAZORPAY ROUTES ==========
// app.use("/api", razorpayRoutes);
// app.use("/api/upload", uploadRoutes);

// // ========== DRIVER ROUTES ==========
// app.use("/api/driver/auth", driverAuthRoutes);
// app.use("/api/driver", authMiddleware, driverRoutes);
// app.use("/api/verification", verificationRoutes);

// // ========== AUTO-PAYOUT SYSTEM ==========
// const AutoPayoutService = require("./services/AutoPayoutService");
// console.log("✅ Auto-payout system initialized");
// console.log("   - Escrow release: Every 5 minutes");
// console.log("   - Daily payouts: 2 AM daily");
// console.log("   - Retry failed: Hourly");

// // Test payout endpoint
// app.get("/api/test-payout", async (req, res) => {
//   try {
//     const result = await AutoPayoutService.manualTrigger("process_holds", {
//       limit: 5,
//     });
//     res.json({ success: true, message: "Test executed", result });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// // Payout routes
// const payoutRoutes = require("./routes/payoutRoutes");
// app.use("/api/payout", payoutRoutes);

// // ========== FAVICON HANDLER ==========
// app.get("/favicon.ico", (req, res) => {
//   res.status(204).end(); // Send "No Content" status
// });

// // ========== TEST DRIVER ROUTE ==========
// app.get("/api/driver-test", (req, res) => {
//   res.json({
//     success: true,
//     message: "Driver API is accessible",
//     endpoints: {
//       register: "POST /api/driver/auth/register (NO TOKEN)",
//       login: "POST /api/driver/auth/login (NO TOKEN)",
//       profile: "GET /api/driver/profile (TOKEN REQUIRED)",
//       orders: "GET /api/driver/orders/available (TOKEN REQUIRED)",
//     },
//   });
// });

// // ========== TEST ADMIN ROUTE ==========
// app.get("/api/test-admin", authMiddleware, adminMiddleware, (req, res) => {
//   res.json({
//     success: true,
//     message: "You are admin!",
//     user: req.user,
//   });
// });

// // ========== HEALTH CHECK ==========
// app.get("/api/health", (req, res) => {
//   res.json({
//     success: true,
//     message: "API is running",
//     timestamp: new Date().toISOString(),
//     driverRoutes: {
//       public: "/api/driver/auth",
//       protected: "/api/driver",
//     },
//   });
// });

// // ========== 404 HANDLER ==========
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Route not found: ${req.method} ${req.url}`,
//   });
// });

// // ========== ERROR HANDLING MIDDLEWARE ==========
// app.use((err, req, res, next) => {
//   console.error("🚨 Error:", err.stack);
//   res.status(err.status || 500).json({
//     success: false,
//     message: err.message || "Internal Server Error",
//     ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
//   });
// });

// // ========== START SERVER ==========
// const PORT = process.env.PORT || 8080;
// server.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const configDB = require("./config/configDb");
const http = require("http");
const { initSocket } = require("./config/socket");
const testSocketRoutes = require("./routes/testSocketRoutes");
const session = require("express-session");
const { RedisStore } = require("connect-redis");
const redisClient = require("./utils/redisClient");
const uploadRoutes = require("./routes/uploadRoutes");

dotenv.config();

// all vendor imports
const vendorAuthRoutes = require("./routes/vendorAuthRoutes");
const vendorRestaurantRoutes = require("./routes/vendorRestaurantRoutes");
const vendorFoodRoutes = require("./routes/vendorFoodRoutes");
const vendorOrderRoutes = require("./routes/vendorOrderRoutes");
const razorpayRoutes = require("./routes/razorpayRoutes");
// Driver imports
const driverAuthRoutes = require("./routes/driverAuthRoutes");
const driverRoutes = require("./routes/driverRoutes");
const verificationRoutes = require("./routes/verificationRoutes");

// Auth middleware
const { authMiddleware } = require("./middlewares/authMiddleware");
const { adminMiddleware } = require("./middlewares/adminMiddleware");
const otpRoutes = require("./routes/otpRoutes");
const app = express();
app.set("trust proxy", 1);
configDB();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);
app.set("io", io);

// Middlewares
// app.use(cors());
// ========== CORS CONFIGURATION - FIXED ==========
// ========== CORS CONFIGURATION ==========
// ========== CORS CONFIGURATION ==========
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://foodorder-frontend-indol.vercel.app", // Hardcode for now
    process.env.CORS_ORIGIN || "https://foodorder-frontend-indol.vercel.app",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  console.log(
    `📡 ${req.method} ${req.url} - Origin: ${req.headers.origin || "No origin"}`,
  );
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

app.use("/api/test", testSocketRoutes);
// ========== TEST ROUTES ==========
app.get("/api/test-simple", (req, res) => {
  res.json({
    success: true,
    message: "Simple test route works!",
  });
});
// const AutoPayoutService = require("./services/AutoPayoutService");
// ========== USER & RESTAURANT ROUTES ==========
app.use("/user", require("./routes/userRoutes"));
app.use("/restaurant", require("./routes/restaurantRoutes"));
app.use("/catogary", require("./routes/categoryRoutes"));
app.use("/api/food", require("./routes/foodRoutes"));
app.use("/api/order", require("./routes/orderRoutes"));

// ========== VENDOR ROUTES ==========
app.use("/api/vendor/auth", vendorAuthRoutes);
app.use("/api/vendor/restaurant", vendorRestaurantRoutes);
app.use("/api/vendor/foods", vendorFoodRoutes);
app.use("/api/vendor/orders", vendorOrderRoutes);
// app.use("/api/vendor/earnings", vendorEarningsRoutes);
app.use("/api/otp", otpRoutes);
// app.use("/api/vendor/withdrawal", vendorWithdrawalRoutes);
// const AutoPayoutController = require("./controllers/autoPayoutController");
// ========== RAZORPAY ROUTES ==========
app.use("/api", razorpayRoutes);
app.use("/api/upload", uploadRoutes);
// ========== DRIVER ROUTES ==========
// PUBLIC DRIVER ROUTES (NO AUTH)
app.use("/api/driver/auth", driverAuthRoutes); // Contains /register, /login

// PROTECTED DRIVER ROUTES (WITH AUTH)
app.use("/api/driver", authMiddleware, driverRoutes); // Contains /profile, /orders, etc.
// app.use("/api/driver", authMiddleware, driverEarningRoutes);
app.use("/api/verification", verificationRoutes);
// Add these lines to your existing server.js file:

// ========== AUTO-PAYOUT SYSTEM INITIALIZATION ==========
const AutoPayoutService = require("./services/AutoPayoutService");

console.log("✅ Auto-payout system initialized");
console.log("   - Escrow release: Every 5 minutes");
console.log("   - Daily payouts: 2 AM daily");
console.log("   - Retry failed: Hourly");

// Test endpoint (remove in production if needed)
app.get("/api/test-payout", async (req, res) => {
  try {
    const result = await AutoPayoutService.manualTrigger("process_holds", {
      limit: 5,
    });
    res.json({ success: true, message: "Test executed", result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add new routes
const payoutRoutes = require("./routes/payoutRoutes");
app.use("/api/payout", payoutRoutes);
// ========== TEST DRIVER ROUTE ==========
app.get("/favicon.ico", (req, res) => {
  res.status(204).end(); // Send "No Content" status
});

// OR if you want to serve a blank favicon:
app.get("/favicon.ico", (req, res) => {
  res.set("Content-Type", "image/x-icon");
  res.end();
});
app.get("/api/driver-test", (req, res) => {
  res.json({
    success: true,
    message: "Driver API is accessible",
    endpoints: {
      register: "POST /api/driver/auth/register (NO TOKEN)",
      login: "POST /api/driver/auth/login (NO TOKEN)",
      profile: "GET /api/driver/profile (TOKEN REQUIRED)",
      orders: "GET /api/driver/orders/available (TOKEN REQUIRED)",
    },
  });
});
// Session middleware
app.use(
  session({
    store: new RedisStore({
      client: redisClient,
      prefix: "session:",
    }),
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

console.log("✅ Redis session store initialized");
if (process.env.NODE_ENV !== "production") {
  console.log("Auto-payout system initialized");

  // Manual test endpoint (remove in production)
  app.get("/api/test-payout", async (req, res) => {
    try {
      const result = await AutoPayoutController.manualTrigger("process_holds", {
        limit: 5,
      });
      res.json({ success: true, message: "Test executed", result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

// Add new routes

// In server.js or any route file:
app.get("/api/test-admin", authMiddleware, adminMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "You are admin!",
    user: req.user,
  });
});
// ========== HEALTH CHECK ==========
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
    driverRoutes: {
      public: "/api/driver/auth",
      protected: "/api/driver",
    },
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("🚨 Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
