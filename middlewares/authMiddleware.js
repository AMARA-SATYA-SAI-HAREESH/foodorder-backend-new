const jwt = require("jsonwebtoken");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
      return res.status(401).send({
        status: false,
        message: "token required",
      });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({
          status: false,
          message: "Invalid token",
        });
      }
      req.userId = decoded.id;
      req.userType = decoded.userType;
      next();
    });
  } catch (error) {
    console.log("Error in auth middleware", error);
    res.status(500).send({
      status: false,
      message: "Error in token validation",
    });
  }
};

module.exports = { authMiddleware };
