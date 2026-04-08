// src/models/user.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('donor', 'volunteer', 'admin'),
        defaultValue: 'donor',
        allowNull: false,
      },
    },
    {
      tableName: 'users', // actual table name in MySQL
      timestamps: true,   // adds createdAt & updatedAt columns
    }
  );

  return User;
};
