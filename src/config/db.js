require('dotenv').config();
const { Sequelize } = require('sequelize');

// Create Sequelize instance (connects to MySQL)
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false, // set to true if you want to see SQL logs
  }
);

// Export sequelize instance
module.exports = sequelize;
