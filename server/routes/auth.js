// src/server/routes/auth.js
const router = require('express').Router();
const { query } = require('../database.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = "your-very-secret-key-12345";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Please provide name, email, and password." });
    }

    const userExists = await query("SELECT email FROM users WHERE email = $1", [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Email already in use." });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;
if (!passwordRegex.test(password)) {
  return res.status(400).json({ error: "Password does not meet all requirements." });
}
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const sql = "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id";
    const result = await query(sql, [name, email, hashedPassword]);
    
    res.status(201).json({
      message: "User created successfully!",
      userId: result.rows[0].id
    });
  } catch (err) {
    res.status(500).json({ error: "Server error during registration." });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Please provide email and password." });
    }

    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials (email)." });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ error: "Invalid credentials (password)." });
    }

    const tokenPayload = { user: { id: user.id, email: user.email, name: user.name } };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      message: "Login successful!",
      token: token,
      user: tokenPayload.user
    });
  } catch (err) {
    res.status(500).json({ error: "Server error during login." });
  }
});

router.post('/google-login', async (req, res) => {
  try {
    const { token } = req.body;
    
    // 3a. Verify the token from Google
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { name, email } = payload;

    // 3b. Check if user already exists
    let userResult = await query("SELECT * FROM users WHERE email = $1", [email]);
    let user = userResult.rows[0];

    // 3c. If user does NOT exist, create them
    if (!user) {
      // Create a long, random password for Google users
      const randomPassword = Math.random().toString(36).slice(-16);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);
      
      const newUserSql = "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email";
      const newUserResult = await query(newUserSql, [name, email, hashedPassword]);
      user = newUserResult.rows[0];
    }

    // 3d. Create *our* JWT token and send it back
    const tokenPayload = { user: { id: user.id, email: user.email, name: user.name } };
    const ourToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      message: "Google login successful!",
      token: ourToken,
      user: tokenPayload.user
    });

  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Server error during Google login." });
  }
});

module.exports = router;