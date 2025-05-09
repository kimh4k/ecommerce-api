const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth');

// All cart routes require authentication
router.use(protect);

// Get user's cart
router.get('/', cartController.getCart);

// Add item to cart
router.post('/items', cartController.addToCart);

// Update cart item quantity
router.put('/items/:id', cartController.updateCartItem);

// Remove item from cart
router.delete('/items/:id', cartController.removeFromCart);

// Clear cart
router.delete('/', cartController.clearCart);

module.exports = router; 