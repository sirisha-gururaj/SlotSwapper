// Import the Express framework
const express = require('express');
// Import CORS (Cross-Origin Resource Sharing)
const cors = require('cors');

// Import our database setup. We will create this file next.
// This line also runs the file, which will create our tables.
const db = require('./database.js');

// Import the auth routes
const authRoutes = require('./routes/auth.js');

// Create an Express application
const app = express();

// Tell Express to use the CORS middleware
app.use(cors());
// Tell Express to parse incoming JSON in request bodies
app.use(express.json());

// Define the port to run on
const PORT = 4000; // You can change this, but 4000 is a good choice

// Tell Express to use the auth routes for any /api/auth URL
app.use('/api/auth', authRoutes);
// A simple "test" route to make sure our server is alive
app.get('/', (req, res) => {
  res.json({ message: "Hello from the SlotSwapper API!" });
});

// Start the server and listen for connections
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});