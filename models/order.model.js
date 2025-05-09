module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'processing', 'delivering', 'completed', 'cancelled'),
      defaultValue: 'pending'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    timestamps: true,
    underscored: true,
    tableName: 'orders'
  });

  Order.associate = (models) => {
    Order.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Order.belongsTo(models.Address, {
      foreignKey: 'addressId',
      as: 'address'
    });
    Order.hasMany(models.OrderItem, {
      foreignKey: 'orderId',
      as: 'items'
    });
  };

  return Order;
}; 