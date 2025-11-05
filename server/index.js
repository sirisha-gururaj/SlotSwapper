// src/server/index.js

// --- 1. REQUIRE NEW MODULES ---
const http = require('http'); // We need the built-in http module
const { WebSocketServer } = require('ws'); // The library we just installed
const jwt = require('jsonwebtoken'); // To verify the token

const express = require('express');
const cors = require('cors');
const db = require('./database.js');

// Import routes
const authRoutes = require('./routes/auth.js');
const eventRoutes = require('./routes/events.js');
const swapRoutes = require('./routes/swap.js');

// Get JWT secret from auth.js (or just redefine it)
const JWT_SECRET = "your-very-secret-key-12345";

const app = express();
app.use(cors());
app.use(express.json());

// --- 2. USE OUR ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/swap', swapRoutes);

app.get('/', (req, res) => {
  res.json({ message: "Hello from the SlotSwapper API!" });
});

const PORT = 4000;

// --- 3. CREATE HTTP SERVER ---
// We pass our Express app to the http module
const server = http.createServer(app);

// --- 4. CREATE WEBSOCKET SERVER ---
// We attach the WebSocket server to the *same* http server
const wss = new WebSocketServer({ server });

// --- 5. MANAGE CONNECTIONS ---
// This is a simple in-memory map to store connections
// It will map a userId (like 1) to their WebSocket connection
const clients = new Map();

wss.on('connection', (ws) => {
  console.log('WebSocket: Client connected');

  // Listen for messages from the client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // 5a. Handle Authentication
      if (data.type === 'AUTH' && data.token) {
        // Verify the token
        const decoded = jwt.verify(data.token, JWT_SECRET);
        if (decoded && decoded.user) {
          const userId = decoded.user.id;

          // Store this connection in our map
          clients.set(userId, ws);
          ws.userId = userId; // Attach userId to the connection
          console.log(`WebSocket: User ${userId} authenticated and mapped.`);

          // Send a success message back
          ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', message: 'WebSocket connection authenticated.' }));
        }
      }
    } catch (e) {
      console.error('WebSocket: Failed to process message', e);
    }
  });

  ws.on('close', () => {
    // 5b. Handle Disconnect
    if (ws.userId) {
      clients.delete(ws.userId);
      console.log(`WebSocket: User ${ws.userId} disconnected.`);
    } else {
      console.log('WebSocket: Client disconnected (was not authenticated).');
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// --- 6. CREATE A HELPER FUNCTION TO SEND NOTIFICATIONS ---
// We need to export this so our swap.js file can use it.

function sendNotification(userId, message) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === ws.OPEN) {
    console.log(`WebSocket: Sending message to User ${userId}:`, message);
    ws.send(JSON.stringify(message));
  } else {
    console.log(`WebSocket: No open connection for User ${userId}.`);
  }
}

// We will attach this function to the 'app' object
// This is a simple way to make it available in other files
app.set('sendNotification', sendNotification);


// --- 7. START THE SERVER ---
// We call server.listen() instead of app.listen()
server.listen(PORT, () => {
  console.log(`Server (HTTP and WebSocket) is running on http://localhost:${PORT}`);
});