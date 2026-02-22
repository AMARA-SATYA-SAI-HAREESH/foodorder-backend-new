const categoryModel = require("../models/categoryModel");
createCategory = async (req, res) => {
  try {
    const { title, imageUrl } = req.body;
    if (!title) {
      return res.status(400).send({
        status: false,
        message: "title is required",
      });
    }
    const existingCategory = await categoryModel.findOne({ title: title });

    if (existingCategory) {
      return res.status(400).send({
        status: false,
        message: "category already exists",
      });
    }
    const category = new categoryModel({ title, imageUrl });
    await category.save();
    res.status(201).send({
      status: true,
      message: "new category created",
      category,
    });
  } catch (err) {
    console.log("Error in creating category api", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

updateCategory = async (req, res) => {
  try {
    const { id, title, imageUrl } = req.body;
    if (!title || !id) {
      return res.status(400).send({
        status: false,
        message: "title and id is required",
      });
    }
    const existingCategory = await categoryModel.findById(id);
    if (!existingCategory) {
      return res.status(400).send({
        status: false,
        message: "category not exists",
      });
    }
    Object.assign(existingCategory, { title: title, imageUrl: imageUrl });
    await existingCategory.save();
    res.status(201).send({
      status: true,
      message: "category updated successfully",
      existingCategory,
    });
  } catch (err) {
    console.log("Error in updating category api", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

deleteCategory = async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.status(400).send({
        status: false,
        message: "category id is required",
      });
    }
    const existingCategory = await categoryModel.findById(id);
    if (!existingCategory) {
      return res.status(400).send({
        status: false,
        message: "category not found",
      });
    }
    await categoryModel.findByIdAndDelete(id);
    res.status(201).send({
      status: true,
      message: "category deleted successfully",
    });
  } catch (err) {
    console.log("Error in deleting category api", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

getAllCategories = async (req, res) => {
  try {
    const categories = await categoryModel.find({});
    if (categories.length === 0) {
      return res.status(200).send({
        status: false,
        message: "no categories found",
      });
    }
    res.status(200).send({
      status: true,
      message: "categories fetched successfully",
      categories,
    });
  } catch (err) {
    console.log("Error in getting all categories api", err);
    res.status(500).send({
      status: false,
      message: "internal server error",
    });
  }
};

module.exports = {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
};
