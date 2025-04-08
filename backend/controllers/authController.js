const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

// Load SECRET_KEY from environment variables
const SECRET_KEY = process.env.SECRET_KEY || "defaultSecretKey";

// Signup Controller
exports.signup = async (req, res) => {
  const { name, email, mobile, password } = req.body;
  
  if (!name || !email || !mobile || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  
  // Check if user already exists
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Error checking for existing user" });
    }
    
    if (results.length > 0) {
      return res.status(409).json({ message: "User with this email already exists" });
    }
    
    try {
      // Hash the password before saving to DB
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Get current timestamp for created_at field
      const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      // Insert user into DB
      const query = "INSERT INTO users (name, email, mobile, password) VALUES (?, ?, ?, ?)";
      db.query(query, [name, email, mobile, hashedPassword, created_at], (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ message: "Error inserting data" });
        }
        
        // Generate token for immediate login
        const userId = results.insertId;
        const token = jwt.sign({ id: userId, email }, SECRET_KEY, { expiresIn: "1d" });
        
        res.status(201).json({ 
          message: "User registered successfully",
          token,
          user: {
            id: userId,
            name,
            email
          }
        });
      });
    } catch (err) {
      console.error("Error in signup process:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
};

// Login Controller
exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  // Validate Input
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  
  // Query to check if user exists
  const query = "SELECT * FROM users WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
    
    // Check if the user is found
    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    const user = results[0];
    
    try {
      // Compare the provided password with the hashed password in DB
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Generate JWT Token
      const payload = {
        id: user.id,
        email: user.email,
      };
      
      jwt.sign(payload, SECRET_KEY, { expiresIn: "1d" }, (err, token) => {
        if (err) {
          console.error("JWT Error:", err);
          return res.status(500).json({ message: "Token generation failed" });
        }
        
        // Send success response
        res.status(200).json({
          message: "Login successful",
          token: token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        });
      });
    } catch (err) {
      console.error("Error in login process:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
};

// Get current user profile
exports.getCurrentUser = (req, res) => {
  const userId = req.user.id;
  
  const query = "SELECT id, name, email, created_at FROM users WHERE id = ?";
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const user = results[0];
    res.status(200).json({ user });
  });
};

// Check token validity
exports.validateToken = (req, res) => {
  // If we get here, it means the token is valid (due to authenticateToken middleware)
  res.status(200).json({ valid: true, user: req.user });
};