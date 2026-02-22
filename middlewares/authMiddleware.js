// const jwt = require("jsonwebtoken");

// const authMiddleware = async (req, res, next) => {
//   try {
//     const token = req.headers["authorization"]?.split(" ")[1];
//     if (!token) {
//       return res.status(401).send({
//         status: false,
//         message: "token required",
//       });
//     }
//     jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//       if (err) {
//         return res.status(401).send({
//           status: false,
//           message: "Invalid token",
//         });
//       }
//       req.userId = decoded.id;
//       req.userType = decoded.userType;
//       next();
//     });
//   } catch (error) {
//     console.log("Error in auth middleware", error);
//     res.status(500).send({
//       status: false,
//       message: "Error in token validation",
//     });
//   }
// };

// module.exports = { authMiddleware };

// const jwt = require("jsonwebtoken");
// const User = require("../models/userModel"); // Add this import

// const authMiddleware = async (req, res, next) => {
//   try {
//     const token = req.headers["authorization"]?.split(" ")[1];

//     if (!token) {
//       return res.status(401).send({
//         success: false,
//         message: "Token required",
//       });
//     }

//     jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
//       if (err) {
//         return res.status(401).send({
//           success: false,
//           message: "Invalid token",
//         });
//       }

//       // Get user from database
//       const user = await User.findById(decoded.id).select("-password");

//       if (!user) {
//         return res.status(401).send({
//           success: false,
//           message: "User not found",
//         });
//       }

//       // Attach user to request
//       req.user = user; // Add this line
//       req.userId = decoded.id || user._id;
//       req.userType = decoded.userType;

//       next();
//     });
//   } catch (error) {
//     console.log("Error in auth middleware", error);
//     res.status(500).send({
//       success: false,
//       message: "Error in token validation",
//     });
//   }
// };

// module.exports = { authMiddleware };

const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
      return res.status(401).send({
        success: false,
        message: "Token required",
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).send({
          success: false,
          message: "Invalid token",
        });
      }

      // ✅ CRITICAL: Check if user still exists
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).send({
          success: false,
          message: "User not found",
        });
      }

      // ✅ Attach user to request
      req.user = user;
      req.userId = decoded.id;
      req.userType = decoded.userType;

      next();
    });
  } catch (error) {
    console.log("Error in auth middleware", error);
    res.status(500).send({
      success: false,
      message: "Error in token validation",
    });
  }
};

module.exports = { authMiddleware };
