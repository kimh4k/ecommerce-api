const { Product, Category, ActivityLog } = require('../models');
const { Op } = require('sequelize');

// Get all products with pagination and filters
const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const where = {};
    const include = [{
      model: Category,
      as: 'category',
      attributes: ['id', 'name']
    }];

    // Filter by category
    if (req.query.category) {
      where.categoryId = req.query.category;
    }

    // Filter by stock status
    if (req.query.stock_status) {
      if (req.query.stock_status === 'available') {
        where.isAvailable = true;
        where.stockQuantity = { [Op.gt]: 0 };
      } else {
        where[Op.or] = [
          { isAvailable: false },
          { stockQuantity: 0 }
        ];
      }
    }

    // Search by name
    if (req.query.search) {
      where.name = { [Op.like]: `%${req.query.search}%` };
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include,
      order: [['name', 'ASC']],
      limit,
      offset
    });

    res.json({
      products,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name']
      }]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
};

// Create new product
const createProduct = async (req, res) => {
  try {
    const { name, description, price, stockQuantity, categoryId, imageUrl } = req.body;

    const product = await Product.create({
      name,
      description,
      price,
      stockQuantity,
      categoryId,
      imageUrl
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'create_product',
      entityType: 'product',
      entityId: product.id
    });

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create product' });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { name, description, price, stockQuantity, categoryId, imageUrl, isAvailable } = req.body;

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.update({
      name,
      description,
      price,
      stockQuantity,
      categoryId,
      imageUrl,
      isAvailable
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'update_product',
      entityType: 'product',
      entityId: product.id
    });

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update product' });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.destroy();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'delete_product',
      entityType: 'product',
      entityId: req.params.id
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete product' });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
}; 