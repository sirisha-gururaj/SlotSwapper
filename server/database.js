// Import the sqlite3 package
const sqlite3 = require('sqlite3').verbose();

// Define the name of our database file
const DB_SOURCE = "db.sqlite";

// Connect to the database
// This will create the file 'db.sqlite' if it doesn't exist
const db = new sqlite3.Database(DB_SOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message);
    throw err;
  } else {
    console.log('Connected to the SQLite database.');

    // Use db.serialize to run commands in order
    db.serialize(() => {
      console.log("Creating database tables...");

      // 1. Create the Users table
      db.run(`
        CREATE TABLE Users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          console.log("Table 'Users' already created.");
        } else {
          console.log("Table 'Users' created.");
        }
      });

      // 2. Create the Events table
      // We add a 'CHECK' constraint to 'status' to act like an ENUM
      db.run(`
        CREATE TABLE Events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          startTime TEXT NOT NULL, -- Storing as ISO 8601 strings (e.g., "2025-11-05T10:00:00Z")
          endTime TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('BUSY', 'SWAPPABLE', 'SWAP_PENDING')),
          userId INTEGER,
          FOREIGN KEY (userId) REFERENCES Users(id)
        )
      `, (err) => {
        if (err) {
          console.log("Table 'Events' already created.");
        } else {
          console.log("Table 'Events' created.");
        }
      });

      // 3. Create the SwapRequests table
      db.run(`
        CREATE TABLE SwapRequests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          requesterSlotId INTEGER NOT NULL,
          receiverSlotId INTEGER NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
          FOREIGN KEY (requesterSlotId) REFERENCES Events(id),
          FOREIGN KEY (receiverSlotId) REFERENCES Events(id)
        )
      `, (err) => {
        if (err) {
          console.log("Table 'SwapRequests' already created.");
        } else {
          console.log("Table 'SwapRequests' created.");
        }
      });

      console.log("...Database setup finished.");
    });
  }
});

// Export the database connection
module.exports = db;