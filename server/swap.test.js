// src/server/swap.test.js
const request = require('supertest');
const app = require('./app');
const server = require('./index');
const { query, initDb, pool } = require('./database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = "your-very-secret-key-12345";

beforeAll(async () => {
  await initDb();
});

beforeEach(async () => {
  // Now this will work
  await query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
  server.close();
});

describe('Swap Logic - POST /api/swap/response/:requestId', () => {

  it('should correctly accept a swap and exchange owners', async () => {
    
    // --- 1. SETUP ---
    const hash1 = await bcrypt.hash('pass123', 10);
    const user1 = await query("INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id", ['User One', 'user1@test.com', hash1]);
    const user1Id = user1.rows[0].id;
    
    const hash2 = await bcrypt.hash('pass123', 10);
    const user2 = await query("INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id", ['User Two', 'user2@test.com', hash2]);
    const user2Id = user2.rows[0].id;
    
    const event1 = await query('INSERT INTO events (title, "startTime", "endTime", status, "userId") VALUES ($1,$2,$3,$4,$5) RETURNING id',
      ['User 1 Slot', '2025-01-01T10:00:00Z', '2025-01-01T11:00:00Z', 'SWAPPABLE', user1Id]);
    const event1Id = event1.rows[0].id;
    
    const event2 = await query('INSERT INTO events (title, "startTime", "endTime", status, "userId") VALUES ($1,$2,$3,$4,$5) RETURNING id',
      ['User 2 Slot', '2025-01-02T14:00:00Z', '2025-01-02T15:00:00Z', 'SWAPPABLE', user2Id]);
    const event2Id = event2.rows[0].id;

    await query("UPDATE events SET status = 'SWAP_PENDING' WHERE id = $1 OR id = $2", [event1Id, event2Id]);

    const swapReq = await query('INSERT INTO swaprequests ("requesterSlotId", "receiverSlotId", status) VALUES ($1,$2,$3) RETURNING id',
      [event2Id, event1Id, 'PENDING']);
    const swapReqId = swapReq.rows[0].id;

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
    const finalEvent1 = (await query("SELECT * FROM events WHERE id = $1", [event1Id])).rows[0];
    const finalEvent2 = (await query("SELECT * FROM events WHERE id = $1", [event2Id])).rows[0];
    const finalSwapReq = (await query("SELECT * FROM swaprequests WHERE id = $1", [swapReqId])).rows[0];

    expect(finalEvent1.userId).toBe(user2Id);
    expect(finalEvent2.userId).toBe(user1Id);
    expect(finalEvent1.status).toBe('BUSY');
    expect(finalEvent2.status).toBe('BUSY');
    expect(finalSwapReq.status).toBe('ACCEPTED');
  });
});