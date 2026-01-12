const express = require("express");
const router = express.Router();
const { testApiController } = require("../controllers/TestController");

router.get("/", testApiController);

module.exports = router;
