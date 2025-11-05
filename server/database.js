// src/server/database.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV !== 'development'
    ? { rejectUnauthorized: false }
    : false
});

const query = (text, params) => pool.query(text, params);

const initDb = async () => {
  console.log("Creating database tables (PostgreSQL)...");
  
  try {
    // 1. Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `);
    console.log("Table 'users' ready.");

    // 2. Create events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        "startTime" TIMESTAMPTZ NOT NULL,
        "endTime" TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('BUSY', 'SWAPPABLE', 'SWAP_PENDING')),
        "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log("Table 'events' ready.");

    // 3. Create swaprequests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS swaprequests (
        id SERIAL PRIMARY KEY,
        "requesterSlotId" INTEGER REFERENCES events(id) ON DELETE CASCADE,
        "receiverSlotId" INTEGER REFERENCES events(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED'))
      );
    `);
    console.log("Table 'swaprequests' ready.");
    
    console.log("...Database setup finished.");
  } catch (err) {
    console.error("Database setup error:", err);
    throw err; // Re-throw the error to stop the process
  }
};

module.exports = { query, initDb, pool };