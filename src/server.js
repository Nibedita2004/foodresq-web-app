// src/server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const { sequelize } = require('./models');
const userRoutes = require('./routes/userRoutes');
const foodRoutes = require('./routes/foodRoutes');
const pickupRoutes = require('./routes/pickupRoutes');
const chatbotRoute = require('./routes/chatbotRoute');

const { setIo } = require('./utils/socket');

const app = express();
const PORT = process.env.PORT || 4000;

// Serve frontend
app.use(express.static(path.join(__dirname, '../public')));

// Middleware
app.use(express.json());

// API routes
app.use('/api/users', userRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/pickup', pickupRoutes);
app.use('/api', chatbotRoute);

// Optional root redirect to login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  // optional config
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// store io for other modules
setIo(io);

// Basic socket connection logging (optional)
io.on('connection', (socket) => {
  console.log('🔌 New client connected, socket id:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected, socket id:', socket.id);
  });
});

// Start server after DB sync
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected via Sequelize');

    await sequelize.sync({ alter: true });
    console.log('🧱 All models synced successfully');

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    process.exit(1);
  }
}

startServer();
