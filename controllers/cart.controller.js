const { Cart, CartItem, Product, ActivityLog } = require('../models');
const { Op } = require('sequelize');

// Get user's cart
const getCart = async (req, res) => {
  try {
    console.log('Getting cart for user:', req.user.id);
    
    // Find or create cart for user
    let [cart, created] = await Cart.findOrCreate({
      where: { userId: req.user.id },
      defaults: {
        userId: req.user.id
      }
    });

    if (created) {
      console.log('Created new cart for user:', cart.id);
    }

    // Fetch cart with items
    cart = await Cart.findOne({
      where: { id: cart.id },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price', 'imageUrl', 'stockQuantity', 'isAvailable']
        }]
      }]
    });

    console.log('Cart found/created:', {
      cartId: cart.id,
      itemCount: cart.items ? cart.items.length : 0
    });

    res.json(cart);
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({ 
      message: 'Failed to fetch cart',
      code: 'GET_CART_FAILED',
      error: err.message
    });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    console.log('Adding to cart:', { productId, quantity, userId: req.user.id });

    // Validate input
    if (!productId || quantity < 1) {
      return res.status(400).json({ 
        message: 'Invalid input',
        code: 'INVALID_INPUT',
        details: {
          productId: !productId,
          quantity: quantity < 1
        }
      });
    }

    // Validate product
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ 
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    if (!product.isAvailable || product.stockQuantity < quantity) {
      return res.status(400).json({ 
        message: 'Product is not available in the requested quantity',
        code: 'INSUFFICIENT_STOCK',
        available: product.stockQuantity
      });
    }

    // Get or create cart
    let [cart, created] = await Cart.findOrCreate({
      where: { userId: req.user.id },
      defaults: {
        userId: req.user.id
      }
    });

    if (created) {
      console.log('Created new cart for user:', cart.id);
    }

    // Check if item already exists in cart
    let cartItem = await CartItem.findOne({
      where: {
        cartId: cart.id,
        productId
      }
    });

    if (cartItem) {
      // Update quantity
      const newQuantity = cartItem.quantity + quantity;
      if (newQuantity > product.stockQuantity) {
        return res.status(400).json({ 
          message: 'Requested quantity exceeds available stock',
          code: 'INSUFFICIENT_STOCK',
          available: product.stockQuantity
        });
      }

      await cartItem.update({ quantity: newQuantity });
      console.log('Updated existing cart item:', cartItem.id);
    } else {
      // Create new cart item
      cartItem = await CartItem.create({
        cartId: cart.id,
        productId,
        quantity
      });
      console.log('Created new cart item:', cartItem.id);
    }

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'add_to_cart',
      entityType: 'cart_item',
      entityId: cartItem.id,
      details: { productId, quantity }
    });

    // Fetch updated cart with items
    const updatedCart = await Cart.findOne({
      where: { id: cart.id },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price', 'imageUrl', 'stockQuantity', 'isAvailable']
        }]
      }]
    });

    console.log('Cart updated successfully:', {
      cartId: updatedCart.id,
      itemCount: updatedCart.items.length
    });

    res.json({
      message: 'Item added to cart',
      code: 'ITEM_ADDED',
      cart: updatedCart
    });
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ 
      message: 'Failed to add item to cart',
      code: 'ADD_TO_CART_FAILED',
      error: err.message
    });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const cartItem = await CartItem.findOne({
      where: { id },
      include: [{
        model: Cart,
        as: 'cart',
        where: { userId: req.user.id }
      }, {
        model: Product,
        as: 'product'
      }]
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    if (quantity > cartItem.product.stockQuantity) {
      return res.status(400).json({ message: 'Requested quantity exceeds available stock' });
    }

    await cartItem.update({ quantity });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'update_cart_item',
      entityType: 'cart_item',
      entityId: cartItem.id,
      details: { quantity }
    });

    res.json({
      message: 'Cart item updated',
      cartItem
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update cart item' });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;

    const cartItem = await CartItem.findOne({
      where: { id },
      include: [{
        model: Cart,
        as: 'cart',
        where: { userId: req.user.id }
      }]
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await cartItem.destroy();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'remove_from_cart',
      entityType: 'cart_item',
      entityId: id
    });

    res.json({ message: 'Item removed from cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to remove item from cart' });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      where: { userId: req.user.id }
    });

    if (!cart) {
      return res.status(404).json({ 
        message: 'Cart not found',
        code: 'CART_NOT_FOUND'
      });
    }

    // Delete all cart items
    await CartItem.destroy({
      where: { cartId: cart.id }
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'clear_cart',
      entityType: 'cart',
      entityId: cart.id
    });

    res.json({ 
      message: 'Cart cleared successfully',
      code: 'CART_CLEARED'
    });
  } catch (err) {
    console.error('Clear cart error:', err);
    res.status(500).json({ 
      message: 'Failed to clear cart',
      code: 'CLEAR_CART_FAILED',
      error: err.message
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
}; 