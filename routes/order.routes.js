const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createOrder,
  getUserOrders,
  getOrderDetails,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/order.controller');
const adminMiddleware = require('../middleware/admin.middleware');

// Protected routes
router.use(protect);

// Create a new order
router.post('/', createOrder);

// Get user's orders
router.get('/', getUserOrders);

// Get order details
router.get('/:id', getOrderDetails);

// Admin routes
router.get('/admin/all', adminMiddleware, getAllOrders);
router.put('/admin/:id/status', adminMiddleware, updateOrderStatus);

module.exports = router; 