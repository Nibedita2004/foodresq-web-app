// src/controllers/foodController.js
const { FoodListing, User } = require('../models');
const { getIo } = require('../utils/socket');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';

// CREATE new food listing
exports.createFood = async (req, res) => {
  try {
    const { title, description, quantity, expiry_date, location } = req.body;
    const donor_id = req.user.id; // from JWT middleware

    const newListing = await FoodListing.create({
      title,
      description,
      quantity,
      expiry_date,
      location,
      donor_id,
    });

    // Emit socket event to notify clients about new listing
    const io = getIo();
    if (io) {
      // send a lightweight payload
      io.emit('new_listing', {
        id: newListing.id,
        title: newListing.title,
        description: newListing.description,
        quantity: newListing.quantity,
        expiry_date: newListing.expiry_date,
        location: newListing.location,
        status: newListing.status,
        donor_id: newListing.donor_id,
      });
    }

    res.status(201).json({ message: '✅ Food listing created successfully!', food: newListing });
  } catch (err) {
    console.error('❌ Error creating food listing:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// READ all listings (public but behavior varies with optional auth)
// - If request carries a valid JWT and user.role === 'donor' -> return only that donor's listings
// - Otherwise -> return all listings. Every listing includes donor_name in the response.
exports.getAllFood = async (req, res) => {
  try {
    // Try to read token from Authorization header (optional)
    let currentUser = null;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        currentUser = decoded; // { id, email, role, ... }
      } catch (e) {
        // invalid/expired token -> treat as unauthenticated (no error)
        currentUser = null;
      }
    }

    // Build query options
    const queryOptions = {
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['id', 'name'],
        },
      ],
    };

    // If donor, restrict to their own listings
    if (currentUser && currentUser.role === 'donor') {
      queryOptions.where = { donor_id: currentUser.id };
    }

    const listings = await FoodListing.findAll(queryOptions);

    // map result to include donor_name at top-level for easy consumption by frontend
    const mapped = listings.map(l => {
      const plain = l.toJSON ? l.toJSON() : l;
      plain.donor_name = (plain.User && plain.User.name) ? plain.User.name : null;
      // remove nested User to keep payload compact if you prefer
      // delete plain.User;
      return plain;
    });

    res.json(mapped);
  } catch (err) {
    console.error('❌ Error fetching food listings:', err.message);
    res.status(500).json({ error: 'Failed to fetch food listings' });
  }
};

// UPDATE listing (only donor who created it)
exports.updateFood = async (req, res) => {
  try {
    const { id } = req.params;
    const food = await FoodListing.findByPk(id);

    if (!food) return res.status(404).json({ error: 'Listing not found' });
    if (food.donor_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    await food.update(req.body);

    // optionally emit update event
    const io = getIo();
    if (io) {
      io.emit('update_listing', { id: food.id, status: food.status });
    }

    res.json({ message: '✅ Food listing updated successfully!', food });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update listing' });
  }
};

// DELETE listing
exports.deleteFood = async (req, res) => {
  try {
    const { id } = req.params;
    const food = await FoodListing.findByPk(id);

    if (!food) return res.status(404).json({ error: 'Listing not found' });
    if (food.donor_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    await food.destroy();

    const io = getIo();
    if (io) {
      io.emit('delete_listing', { id });
    }

    res.json({ message: '🗑️ Food listing deleted successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete listing' });
  }
};
