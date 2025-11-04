const jwt = require('jsonwebtoken');
// We need the same secret key we used in auth.js
const JWT_SECRET = "your-very-secret-key-12345";

// This is our "bouncer" function
function authMiddleware(req, res, next) {
  // 1. Get the token from the request header
  // It's usually sent as: "Bearer <token>"
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ error: "No token, authorization denied." });
  }

  // 2. Check if the header format is correct
  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ error: "Token format is invalid. Use 'Bearer <token>'." });
  }

  const token = tokenParts[1];

  // 3. Verify the token
  try {
    // 'jwt.verify' checks if the token is valid and not expired
    const decoded = jwt.verify(token, JWT_SECRET);

    // 4. IMPORTANT: Attach the user's info to the request object
    // The 'decoded' payload was what we put in it: { user: { id: 1, ... } }
    req.user = decoded.user;

    // 5. Tell Express to continue to the *next* function (our actual endpoint)
    next();

  } catch (err) {
    res.status(401).json({ error: "Token is not valid." });
  }
}

module.exports = authMiddleware;