// src/models/pickup.js
module.exports = (sequelize, DataTypes) => {
  const Pickup = sequelize.define(
    'Pickup',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      food_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      volunteer_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('claimed', 'completed'),
        defaultValue: 'claimed',
      },
    },
    {
      tableName: 'pickups',
      timestamps: true,
    }
  );

  return Pickup;
};
