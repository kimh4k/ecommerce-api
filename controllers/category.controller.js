const { Category, Product, ActivityLog } = require('../models');

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['displayOrder', 'ASC']]
    });

    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [{
        model: Product,
        as: 'products',
        attributes: ['id', 'name', 'price', 'imageUrl', 'isAvailable']
      }]
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch category' });
  }
};

// Create new category
const createCategory = async (req, res) => {
  try {
    const { name, description, displayOrder } = req.body;

    const category = await Category.create({
      name,
      description,
      displayOrder
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'create_category',
      entityType: 'category',
      entityId: category.id
    });

    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create category' });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { name, description, displayOrder } = req.body;

    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.update({
      name,
      description,
      displayOrder
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'update_category',
      entityType: 'category',
      entityId: category.id
    });

    res.json({
      message: 'Category updated successfully',
      category
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update category' });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category has products
    const productCount = await Product.count({ where: { categoryId: category.id } });
    if (productCount > 0) {
      return res.status(400).json({ message: 'Cannot delete category with associated products' });
    }

    await category.destroy();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'delete_category',
      entityType: 'category',
      entityId: req.params.id
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete category' });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
}; 