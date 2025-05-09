module.exports = (sequelize, DataTypes) => {
  const CartItem = sequelize.define('CartItem', {
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    timestamps: true,
    underscored: true,
    tableName: 'cart_items'
  });

  CartItem.associate = (models) => {
    CartItem.belongsTo(models.Cart, {
      foreignKey: 'cartId',
      as: 'cart'
    });
    CartItem.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });
  };

  return CartItem;
}; 