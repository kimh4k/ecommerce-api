module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'user'),
      defaultValue: 'user'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    underscored: true,
    tableName: 'users',
    indexes: [
      {
        unique: true,
        fields: ['email']
      }
    ]
  });

  User.associate = (models) => {
    User.hasOne(models.Profile, {
      foreignKey: 'userId',
      as: 'profile'
    });
    User.hasMany(models.Address, {
      foreignKey: 'userId',
      as: 'addresses'
    });
    User.hasOne(models.Cart, {
      foreignKey: 'userId',
      as: 'cart'
    });
    User.hasMany(models.Order, {
      foreignKey: 'userId',
      as: 'orders'
    });
    User.hasMany(models.ActivityLog, {
      foreignKey: 'userId',
      as: 'activityLogs'
    });
  };

  return User;
}; 