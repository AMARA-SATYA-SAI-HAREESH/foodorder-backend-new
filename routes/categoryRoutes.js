// const { cacheMiddleware } = require('../middlewares/cacheMiddleware');
// const express = require("express");
// const {
//   createCategory,
//   updateCategory,
//   deleteCategory,
//   getAllCategories,
// } = require("../controllers/categoryController");
// const router = express.Router();

// router.post("/create-category", createCategory);

// router.post("/update-category", updateCategory);

// router.delete("/delete-category", deleteCategory);

// router.get("/getAllCategories", getAllCategories);

// module.exports = router;

const express = require("express");
const {
  cacheMiddleware,
  clearCache,
} = require("../middlewares/cacheMiddleware");
const {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
} = require("../controllers/categoryController");
const router = express.Router();

// POST/PUT/DELETE routes - clear cache
router.post(
  "/create-category",
  async (req, res, next) => {
    // Clear categories cache before proceeding
    await clearCache("cache:/catogary/getAllCategories*");
    next();
  },
  createCategory,
);

router.post(
  "/update-category",
  async (req, res, next) => {
    await clearCache("cache:/catogary/getAllCategories*");
    next();
  },
  updateCategory,
);

router.delete(
  "/delete-category",
  async (req, res, next) => {
    await clearCache("cache:/catogary/getAllCategories*");
    next();
  },
  deleteCategory,
);

// GET route - cache for 5 minutes (300 seconds)
router.get("/getAllCategories", cacheMiddleware(300), getAllCategories);

module.exports = router;
