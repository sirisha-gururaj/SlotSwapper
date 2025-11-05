// src/server/swap.test.js
const request = require('supertest');
const app = require('./app');
const server = require('./index');
// --- 1. IMPORT BOTH db AND initDb ---
const { db, initDb } = require('./database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = "your-very-secret-key-12345";

// ... (your dbRun and dbGet helper functions are perfect) ...
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      resolve(this);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
};

// --- 2. ADD beforeAll ---
// This runs ONCE before all tests
beforeAll(async () => {
  await initDb(); // Ensures tables are created before any tests run
});

// --- 3. beforeEach is NOW SAFE ---
// This runs before EACH 'it' test block
beforeEach(async () => {
  // Clear all data from tables
  await dbRun("DELETE FROM SwapRequests");
  await dbRun("DELETE FROM Events");
  await dbRun("DELETE FROM Users");
});

afterAll(() => {
  db.close();
  server.close();
});

// ... (Your 'describe' block and test case stay exactly the same) ...
describe('Swap Logic - POST /api/swap/response/:requestId', () => {

  it('should correctly accept a swap and exchange owners', async () => {
    
    // --- 1. SETUP ---
    const hash1 = await bcrypt.hash('pass123', 10);
    const user1 = await dbRun("INSERT INTO Users (name, email, password) VALUES (?,?,?)", ['User One', 'user1@test.com', hash1]);
    const user1Id = user1.lastID;
    
    const hash2 = await bcrypt.hash('pass123', 10);
    const user2 = await dbRun("INSERT INTO Users (name, email, password) VALUES (?,?,?)", ['User Two', 'user2@test.com', hash2]);
    const user2Id = user2.lastID;
    
    const event1 = await dbRun("INSERT INTO Events (title, startTime, endTime, status, userId) VALUES (?,?,?,?,?)",
      ['User 1 Slot', '2025-01-01T10:00:00Z', '2025-01-01T11:00:00Z', 'SWAPPABLE', user1Id]);
    const event1Id = event1.lastID;
    
    const event2 = await dbRun("INSERT INTO Events (title, startTime, endTime, status, userId) VALUES (?,?,?,?,?)",
      ['User 2 Slot', '2025-01-02T14:00:00Z', '2025-01-02T15:00:00Z', 'SWAPPABLE', user2Id]);
    const event2Id = event2.lastID;

    await dbRun("UPDATE Events SET status = 'SWAP_PENDING' WHERE id = ? OR id = ?", [event1Id, event2Id]);

    const swapReq = await dbRun("INSERT INTO SwapRequests (requesterSlotId, receiverSlotId, status) VALUES (?,?,?)",
      [event2Id, event1Id, 'PENDING']);
    const swapReqId = swapReq.lastID;

    const token = jwt.sign({ user: { id: user1Id, email: 'user1@test.com', name: 'User One' } }, JWT_SECRET);

    // --- 2. EXECUTE ---
    const response = await request(app)
      .post(`/api/swap/response/${swapReqId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ acceptance: true });

    // --- 3. ASSERT (API Response) ---
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Swap accepted! Your calendars have been updated.");

    // --- 4. ASSERT (Database State) ---
    const finalEvent1 = await dbGet("SELECT * FROM Events WHERE id = ?", [event1Id]);
    const finalEvent2 = await dbGet("SELECT * FROM Events WHERE id = ?", [event2Id]);
    const finalSwapReq = await dbGet("SELECT * FROM SwapRequests WHERE id = ?", [swapReqId]);

    expect(finalEvent1.userId).toBe(user2Id);
    expect(finalEvent2.userId).toBe(user1Id);
    expect(finalEvent1.status).toBe('BUSY');
    expect(finalEvent2.status).toBe('BUSY');
    expect(finalSwapReq.status).toBe('ACCEPTED');
  });
});