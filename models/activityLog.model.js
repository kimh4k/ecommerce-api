module.exports = (sequelize, DataTypes) => {
  const ActivityLog = sequelize.define('ActivityLog', {
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('details');
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue('details', JSON.stringify(value));
      }
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    timestamps: true,
    underscored: true,
    tableName: 'activity_logs'
  });

  ActivityLog.associate = (models) => {
    ActivityLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return ActivityLog;
}; 