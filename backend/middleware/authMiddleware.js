const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY || "defaultSecretKey";

// Middleware to verify token
const authenticateToken = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access Denied. No token provided." });
  }
  
  const token = authHeader.split(" ")[1];
  
  try {
    const verified = jwt.verify(token, SECRET_KEY);
    req.user = verified;
    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authenticateToken;