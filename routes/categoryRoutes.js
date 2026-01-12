const express = require("express");
const {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
} = require("../controllers/categoryController");
const router = express.Router();

router.post("/create-category", createCategory);

router.post("/update-category", updateCategory);

router.delete("/delete-category", deleteCategory);

router.get("/getAllCategories", getAllCategories);

module.exports = router;
