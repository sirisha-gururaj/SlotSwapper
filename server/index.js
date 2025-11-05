// src/server/index.js
const http = require('http');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const app = require('./app');
const { initDb } = require('./database.js'); 

const JWT_SECRET = "your-very-secret-key-12345";
const PORT = 4000;

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Map();

wss.on('connection', (ws) => {
  console.log('WebSocket: Client connected');
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'AUTH' && data.token) {
        const decoded = jwt.verify(data.token, JWT_SECRET);
        if (decoded && decoded.user) {
          const userId = decoded.user.id;
          clients.set(userId, ws);
          ws.userId = userId;
          console.log(`WebSocket: User ${userId} authenticated.`);
          ws.send(JSON.stringify({ type: 'AUTH_SUCCESS' }));
        }
      }
    } catch (e) { console.error('WS message error', e); }
  });

  ws.on('close', () => {
    if (ws.userId) {
      clients.delete(ws.userId);
      console.log(`WebSocket: User ${ws.userId} disconnected.`);
    }
  });
  ws.on('error', (error) => console.error('WebSocket error:', error));
});

function sendNotification(userId, message) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === ws.OPEN) {
    console.log(`WebSocket: Sending message to User ${userId}:`, message);
    ws.send(JSON.stringify(message));
  } else {
    console.log(`WebSocket: No open connection for User ${userId}.`);
  }
}
function broadcast(message, excludedUserId) {
  console.log(`WebSocket: Broadcasting message:`, message);
  for (const [userId, client] of clients.entries()) {
    if (userId !== excludedUserId && client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
}
app.set('sendNotification', sendNotification);
app.set('broadcast', broadcast);
const startServer = async () => {
  try {
    await initDb(); // Wait for the database to be ready
    
    server.listen(PORT, () => {
      console.log(`Server (HTTP and WebSocket) is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  }
};

// Only start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = server;