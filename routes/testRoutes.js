// routes/testRoutes.js
const express = require("express");
const { createTestOrder } = require("../controllers/testController");
const router = express.Router();

router.post("/create-test-order", createTestOrder);

module.exports = router;
