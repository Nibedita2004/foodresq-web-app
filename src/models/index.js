const Sequelize = require('sequelize');
const sequelize = require('../config/db');

// Initialize empty object to hold all models
const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./user')(sequelize, Sequelize.DataTypes);
db.FoodListing = require('./foodListing')(sequelize, Sequelize.DataTypes); 
db.Pickup = require('./pickup')(sequelize, Sequelize.DataTypes);

db.User.hasMany(db.FoodListing, { foreignKey: 'donor_id' });
db.FoodListing.belongsTo(db.User, { foreignKey: 'donor_id' });

db.User.hasMany(db.Pickup, { foreignKey: 'volunteer_id' });
db.Pickup.belongsTo(db.User, { foreignKey: 'volunteer_id' });

db.FoodListing.hasOne(db.Pickup, { foreignKey: 'food_id' });
db.Pickup.belongsTo(db.FoodListing, { foreignKey: 'food_id' });

module.exports = db;
