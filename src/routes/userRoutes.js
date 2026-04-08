const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/userController');
const verifyToken = require('../middleware/auth');

// Routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// ✅ Protected route example
router.get('/profile', verifyToken, (req, res) => {
  res.json({
    message: '✅ Access granted to protected route!',
    user: req.user, // shows decoded token data
  });
});

module.exports = router;
