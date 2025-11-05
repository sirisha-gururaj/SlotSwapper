// src/server/app.js
const express = require('express');
const { db } = require('./database.js'); // We're not using this, but good to keep
const app = express();

// --- NEW CORS CONFIG ---
const cors = require('cors');
const allowedOrigins = [
  'https://slotswapper-rouge.vercel.app', // Your Vercel URL
  'http://localhost:5173'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('This origin is not allowed by CORS'));
    }
  },
  methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization',
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
// --- END NEW CORS CONFIG ---

app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth.js');
const eventRoutes = require('./routes/events.js');
const swapRoutes = require('./routes/swap.js');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/swap', swapRoutes);

app.get('/', (req, res) => {
  res.json({ message: "Hello from the SlotSwapper API!" });
});

// Helper function for sending notifications
app.set('sendNotification', (userId, message) => {
  console.log(`(No-op) Faking notification for ${userId}:`, message);
});

module.exports = app;