const axios = require("axios");

exports.verifyCaptcha = async (req, res, next) => {
  try {
    const { captchaToken } = req.body;

    if (!captchaToken) {
      return res.status(400).json({
        success: false,
        message: "CAPTCHA token required",
      });
    }

    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: captchaToken,
        },
      },
    );

    if (!response.data.success) {
      return res.status(400).json({
        success: false,
        message: "CAPTCHA verification failed",
      });
    }

    next();
  } catch (error) {
    console.error("CAPTCHA error:", error);
    res.status(500).json({
      success: false,
      message: "CAPTCHA verification error",
    });
  }
};
