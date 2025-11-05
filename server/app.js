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
// --- NEW CORS CONFIG ---
// Define the list of allowed frontend URLs
const allowedOrigins = [
  'https://slotswapper-rouge.vercel.app',
  'http://localhost:5173'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Check if the request's origin is in our allowed list
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      // !origin allows server-to-server requests or tools like Postman
      callback(null, true);
    } else {
      callback(new Error('This origin is not allowed by CORS'));
    }
  },
  methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS', // Explicitly allow all our methods
  allowedHeaders: 'Content-Type,Authorization', // Explicitly allow required headers
};

// Enable preflight (OPTIONS) requests for all routes
app.options('*', cors(corsOptions));

// Use the CORS settings for all other requests
app.use(cors(corsOptions));
// --- END NEW CORS CONFIG ---
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