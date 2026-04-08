const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { createFood, getAllFood, updateFood, deleteFood } = require('../controllers/foodController');

// Routes
router.post('/', verifyToken, createFood);     // Create listing
router.get('/', getAllFood);                   // Get all listings (public)
router.put('/:id', verifyToken, updateFood);   // Update own listing
router.delete('/:id', verifyToken, deleteFood); // Delete own listing

module.exports = router;
