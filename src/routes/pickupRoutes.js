const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { claimFood, completePickup,getMyPickups } = require('../controllers/pickupController');

// Routes
router.post('/claim', verifyToken, claimFood);               // volunteer claims a food
router.put('/complete/:pickup_id', verifyToken, completePickup); // mark pickup complete

router.get('/my', verifyToken, getMyPickups);

module.exports = router;
