// src/server/app.js

// NOTE: We are NOT creating the http server or websocket server here.
// This file is *only* for the Express app logic.

const express = require('express');
const cors = require('cors');
const { db } = require('./database.js'); // This will still run and create tables

// Import routes
const authRoutes = require('./routes/auth.js');
const eventRoutes = require('./routes/events.js');
const swapRoutes = require('./routes/swap.js');

const app = express();
// Define the single, allowed origin
const corsOptions = {
  origin: 'https://slotswapper-rouge.vercel.app' // <-- Your Vercel URL
};

app.use(cors(corsOptions));
app.use(express.json());

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/swap', swapRoutes);

app.get('/', (req, res) => {
  res.json({ message: "Hello from the SlotSwapper API!" });
});

// Helper function for sending notifications (we'll re-attach it)
// We create a placeholder. index.js will override this.
app.set('sendNotification', (userId, message) => {
  console.log(`(No-op) Faking notification for ${userId}:`, message);
});

// Export the app
module.exports = app;