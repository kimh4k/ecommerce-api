const { Order, OrderItem, Cart, CartItem, Product, Address, ActivityLog, User, sequelize } = require('../models');
const { Op } = require('sequelize');

// Get user's orders
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.findAll({
      where: { userId },
      include: [
        {
        model: OrderItem,
          include: [Product]
        },
        Address
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id
      },
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price', 'imageUrl']
        }]
      }, {
        model: Address,
        as: 'address'
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

// Create new order
const createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Order creation request body:', req.body);
    const { paymentMethod, paymentInfo, shippingInfo } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({
      where: { userId: req.user.id },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }]
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        message: 'Cart is empty',
        code: 'EMPTY_CART'
      });
    }

    // Create shipping address
    const address = await Address.create({
      userId: req.user.id,
      name: shippingInfo.name,
      addressLine1: shippingInfo.addressLine1,
      addressLine2: shippingInfo.addressLine2,
      city: shippingInfo.city,
      state: shippingInfo.state,
      postalCode: shippingInfo.postalCode,
      country: shippingInfo.country,
      phone: shippingInfo.phone,
      isDefault: false
    }, { transaction });

    // Calculate total
    const totalAmount = cart.items.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);

    // Create order
    const order = await Order.create({
      userId: req.user.id,
      addressId: address.id, // Link the address
      totalAmount,
      status: 'pending',
      paymentMethod,
      paymentInfo
    }, { transaction });

    // Create order items
    const orderItems = await Promise.all(cart.items.map(item => {
      return OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.product.price
      }, { transaction });
    }));

    // Update product stock
    await Promise.all(cart.items.map(item => {
      return Product.update(
        { 
          stockQuantity: item.product.stockQuantity - item.quantity 
        },
        { 
          where: { id: item.productId },
          transaction
        }
      );
    }));

    // Clear cart
    await CartItem.destroy({
      where: { cartId: cart.id },
      transaction
    });

    await transaction.commit();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'create_order',
      entityType: 'order',
      entityId: order.id,
      details: { 
        orderId: order.id,
        totalAmount,
        itemCount: orderItems.length
      }
    });

    // Fetch complete order with items and address
    const completeOrder = await Order.findOne({
      where: { id: order.id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'price', 'imageUrl']
          }]
        },
        {
          model: Address,
          as: 'address'
        }
      ]
    });

    res.status(201).json({
      message: 'Order created successfully',
      code: 'ORDER_CREATED',
      order: completeOrder
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Create order error:', err);
    res.status(500).json({ 
      message: 'Failed to create order',
      code: 'ORDER_CREATION_FAILED',
      error: err.message
    });
  }
};

// Update order status (admin only)
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

// Get all orders (admin only)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price', 'imageUrl']
        }]
      }, {
        model: Address,
        as: 'address'
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

// Get order details
const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({
      where: { id, userId },
      include: [
        {
          model: OrderItem,
          include: [Product]
        },
        Address,
        User
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Error fetching order details', error: error.message });
  }
};

module.exports = {
  getUserOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  getAllOrders,
  getOrderDetails
}; 