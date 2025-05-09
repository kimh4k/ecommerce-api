module.exports = (sequelize, DataTypes) => {
  const Cart = sequelize.define('Cart', {}, {
    timestamps: true,
    underscored: true,
    tableName: 'carts'
  });

  Cart.associate = (models) => {
    Cart.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Cart.hasMany(models.CartItem, {
      foreignKey: 'cartId',
      as: 'items'
    });
  };

  return Cart;
}; 