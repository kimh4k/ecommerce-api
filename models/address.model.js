module.exports = (sequelize, DataTypes) => {
  const Address = sequelize.define('Address', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    addressLine1: {
      type: DataTypes.STRING,
      allowNull: false
    },
    addressLine2: {
      type: DataTypes.STRING,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: false
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    timestamps: true,
    underscored: true,
    tableName: 'addresses'
  });

  Address.associate = (models) => {
    Address.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Address.hasMany(models.Order, {
      foreignKey: 'addressId',
      as: 'orders'
    });
  };

  return Address;
}; 