// src/server/database.js
const sqlite3 = require('sqlite3').verbose();
const DB_SOURCE = process.env.NODE_ENV === 'test' ? "test.db.sqlite" : "db.sqlite";

const db = new sqlite3.Database(DB_SOURCE, (err) => {
  if (err) {
    console.error(err.message);
    throw err;
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// This is our new promise-based init function
const initDb = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log("Creating database tables...");

      db.run(`
        CREATE TABLE IF NOT EXISTS Users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL
        )
      `, (err) => {
        if (err) return reject(err);
        console.log("Table 'Users' ready.");
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS Events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          startTime TEXT NOT NULL,
          endTime TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('BUSY', 'SWAPPABLE', 'SWAP_PENDING')),
          userId INTEGER,
          FOREIGN KEY (userId) REFERENCES Users(id)
        )
      `, (err) => {
        if (err) return reject(err);
        console.log("Table 'Events' ready.");
      });

      // This is the last table, so we resolve the promise here
      db.run(`
        CREATE TABLE IF NOT EXISTS SwapRequests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          requesterSlotId INTEGER NOT NULL,
          receiverSlotId INTEGER NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
          FOREIGN KEY (requesterSlotId) REFERENCES Events(id),
          FOREIGN KEY (receiverSlotId) REFERENCES Events(id)
        )
      `, (err) => {
        if (err) return reject(err);
        console.log("Table 'SwapRequests' ready.");
        
        console.log("...Database setup finished.");
        resolve(); // Signal that the DB is ready
      });
    });
  });
};

// We now export both the db connection AND the init function
module.exports = { db, initDb };