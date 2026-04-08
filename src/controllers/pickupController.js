// src/controllers/pickupController.js
const { Pickup, FoodListing } = require('../models');
const { getIo } = require('../utils/socket');

// Volunteer claims a food listing
exports.claimFood = async (req, res) => {
  try {
    const { food_id } = req.body;
    const volunteer_id = req.user.id;

    // check if food exists
    const food = await FoodListing.findByPk(food_id);
    if (!food) return res.status(404).json({ error: 'Food listing not found' });

    // check status
    if (food.status !== 'available')
      return res.status(400).json({ error: 'Food already claimed or completed' });

    // create pickup
    const pickup = await Pickup.create({ food_id, volunteer_id, status: 'claimed' });

    // update food status
    await food.update({ status: 'claimed' });

    // emit event
    const io = getIo();
    if (io) {
      io.emit('claimed', {
        pickup_id: pickup.id,
        food_id: food.id,
        volunteer_id,
        status: 'claimed',
      });
    }

    res.status(201).json({ message: '✅ Food successfully claimed!', pickup });
  } catch (err) {
    console.error('❌ Error claiming food:', err.message);
    res.status(500).json({ error: 'Something went wrong while claiming food' });
  }
};

// Volunteer completes pickup
exports.completePickup = async (req, res) => {
  try {
    const { pickup_id } = req.params;
    const volunteer_id = req.user.id;

    const pickup = await Pickup.findByPk(pickup_id);
    if (!pickup) return res.status(404).json({ error: 'Pickup not found' });

    // Only the volunteer who claimed can complete
    if (pickup.volunteer_id !== volunteer_id)
      return res.status(403).json({ error: 'Not authorized to complete this pickup' });

    await pickup.update({ status: 'completed' });

    // Update food status to completed
    const food = await FoodListing.findByPk(pickup.food_id);
    if (food) await food.update({ status: 'completed' });

    // emit event
    const io = getIo();
    if (io) {
      io.emit('completed', {
        pickup_id: pickup.id,
        food_id: pickup.food_id,
        volunteer_id,
        status: 'completed',
      });
    }

    res.json({ message: '✅ Pickup completed successfully!', pickup });
  } catch (err) {
    console.error('❌ Error completing pickup:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// Get pickups claimed by current user (volunteer)
exports.getMyPickups = async (req, res) => {
  try {
    const volunteer_id = req.user.id;

    const pickups = await Pickup.findAll({
      where: { volunteer_id },
      include: [
        {
          model: FoodListing,
          attributes: ['id', 'title', 'status', 'donor_id', 'location', 'expiry_date'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ pickups });
  } catch (err) {
    console.error('❌ Error fetching my pickups:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
};
