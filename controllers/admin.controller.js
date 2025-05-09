const { 
  User, 
  Order, 
  Product, 
  Category, 
  ActivityLog,
  sequelize,
  OrderItem,
  Profile
} = require('../models');
const { Op } = require('sequelize');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get total users and products
    const totalUsers = await User.count();
    const totalProducts = await Product.count();

    // Get daily purchase data for chart
    const dailyPurchases = await Order.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalAmount']
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']]
    });

    // Get top 10 products by quantity
    const topProducts = await OrderItem.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity']
      ],
      include: [{
        model: Product,
        attributes: ['name', 'price']
      }],
      group: ['productId'],
      order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
      limit: 10
    });

    // Get top 10 users by purchase amount
    const topUsers = await Order.findAll({
      where: whereClause,
      attributes: [
        'userId',
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalSpent']
      ],
        include: [{
          model: User,
        attributes: ['email'],
        include: [{
          model: Profile,
          attributes: ['firstName', 'lastName']
        }]
      }],
      group: ['userId'],
      order: [[sequelize.fn('SUM', sequelize.col('totalAmount')), 'DESC']],
      limit: 10
    });

    res.json({
        totalUsers,
        totalProducts,
      dailyPurchases,
      topProducts,
      topUsers
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
};

// User management
const getAllUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { '$profile.firstName$': { [Op.like]: `%${search}%` } },
        { '$profile.lastName$': { [Op.like]: `%${search}%` } },
        { '$profile.phone$': { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where: whereClause,
      include: [{
        model: Profile,
        as: 'profile'
      }],
      attributes: { exclude: ['password'] }
    });

    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{
        model: Profile,
        as: 'profile'
      }],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, isActive, profile } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user
    await user.update({
      email,
      role,
      isActive
    });

    // Update profile
    if (profile) {
      const [userProfile] = await Profile.findOrCreate({
        where: { userId: id }
      });
      await userProfile.update(profile);
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

// Order management
const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const where = {};

    if (req.query.status) {
      where.status = req.query.status;
    }

    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'name', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      orders,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{
        model: User,
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    await order.update({ status });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'update_order_status',
      entityType: 'order',
      entityId: order.id,
      details: { status }
    });

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update order status' });
  }
};

// Product management
const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Error creating product' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.update(req.body);
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Error updating product' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.destroy();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
};

// Category management
const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);

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

const updateCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.update(req.body);

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

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
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

// Activity logs
const getActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const where = {};

    if (req.query.userId) {
      where.userId = req.query.userId;
    }

    if (req.query.action) {
      where.action = req.query.action;
    }

    const { count, rows: logs } = await ActivityLog.findAndCountAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'name', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      logs,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  getActivityLogs
}; 