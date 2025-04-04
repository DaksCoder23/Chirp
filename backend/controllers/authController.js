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

  // Hash the password before saving to DB
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insert user into DB
  const query = "INSERT INTO users (name, email, mobile, password) VALUES (?, ?, ?, ?)";
  db.query(query, [name, email, mobile, hashedPassword], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Error inserting data" });
    }
    res.status(201).json({ message: "User registered successfully" });
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

    jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" }, (err, token) => {
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
  });
};
