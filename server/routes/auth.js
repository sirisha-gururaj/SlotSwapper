// Import the 'express' router
const router = require('express').Router();
// Import the database connection
const { db } = require('../database.js');
// Import 'bcrypt' for password hashing
const bcrypt = require('bcrypt');
// Import 'jsonwebtoken' for creating JWTs
const jwt = require('jsonwebtoken');

// --- A secret key for signing our JWTs ---
// (In a real app, this should be in a .env file, but this is fine for the challenge)
const JWT_SECRET = "your-very-secret-key-12345";

// ===========================================
//  1. REGISTER A NEW USER
//  Endpoint: POST /api/auth/register
// ===========================================
router.post('/register', async (req, res) => {
  try {
    // Get user data from the request body
    const { name, email, password } = req.body;

    // 1. Check for missing fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Please provide name, email, and password." });
    }

    // 2. Check if user already exists in the database
    const userExists = await new Promise((resolve, reject) => {
      db.get("SELECT email FROM Users WHERE email = ?", [email], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (userExists) {
      return res.status(400).json({ error: "Email already in use." });
    }

    // 3. Hash the password
    // A "salt round" of 10 is standard for bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Insert the new user into the Users table
    const sql = "INSERT INTO Users (name, email, password) VALUES (?, ?, ?)";
    db.run(sql, [name, email, hashedPassword], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // 5. Send a success response
      // 'this.lastID' gives us the ID of the new user
      res.status(201).json({
        message: "User created successfully!",
        userId: this.lastID
      });
    });

  } catch (err) {
    res.status(500).json({ error: "Server error during registration." });
  }
});


// ===========================================
//  2. LOG IN A USER
//  Endpoint: POST /api/auth/login
// ===========================================
router.post('/login', async (req, res) => {
  try {
    // Get data from request body
    const { email, password } = req.body;

    // 1. Check for missing fields
    if (!email || !password) {
      return res.status(400).json({ error: "Please provide email and password." });
    }

    // 2. Find the user by email
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM Users WHERE email = ?", [email], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials (email)." });
    }

    // 3. Compare the provided password with the stored hashed password
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(400).json({ error: "Invalid credentials (password)." });
    }

    // 4. User is valid! Create a JWT token
    const tokenPayload = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '1d' // Token will be valid for 1 day
    });

    // 5. Send the token back to the client
    res.status(200).json({
      message: "Login successful!",
      token: token,
      user: tokenPayload.user // Send user info as well
    });

  } catch (err) {
    res.status(500).json({ error: "Server error during login." });
  }
});


// Export the router so we can use it in index.js
module.exports = router;