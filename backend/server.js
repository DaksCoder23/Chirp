const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const db = require("./config/db");
const connectMongoDB = require("./config/mongodb");
const authRoutes = require("./routes/authRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const createUserTable = require("./models/User");
const setupWebSocket = require("./websocket/handler");
const authenticateToken = require("./middleware/authMiddleware");
const requestStats = {
  total: 0,
  byEndpoint: {},
  byMethod: {},
  lastReset: new Date()
};
dotenv.config();
const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(cors());

// Connect to databases
createUserTable(); // Create MySQL users table if it doesn't exist
connectMongoDB(); // Connect to MongoDB

// Store active users in memory
const activeUsers = new Set();

// Middleware to track active users
const trackActiveUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("Auth header:", authHeader); // Debug log
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("No valid auth header found");
    return next();
  }
  
  const token = authHeader.split(" ")[1];
  
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    console.log("Decoded token:", decoded); // See the decoded content
    
    const userId = decoded.userId || decoded.id;
    
    if (userId) {
      activeUsers.add(userId);
      console.log(`User ${userId} added to active users`);
      console.log("Active Users:", activeUsers.size); // Log count instead of entire set
    }
  } catch (err) {
    console.error("Invalid token", err);
  }
  next();
};

app.use(trackActiveUser);
// Request counter middleware
const countRequests = (req, res, next) => {
  // Increment total requests
  requestStats.total++;
  
  // Count by endpoint
  const endpoint = req.originalUrl;
  requestStats.byEndpoint[endpoint] = (requestStats.byEndpoint[endpoint] || 0) + 1;
  
  // Count by method
  const method = req.method;
  requestStats.byMethod[method] = (requestStats.byMethod[method] || 0) + 1;
  
  next();
};

app.use(countRequests);
// ✅ API to get total users from MySQL
app.get("/api/users/count", (req, res) => {
  db.query("SELECT COUNT(*) AS totalUsers FROM users", (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ totalUsers: results[0].totalUsers });
  });
});

// ✅ API to get active users count
app.get("/api/active-users-count", (req, res) => {
  res.json({ activeUsers: activeUsers.size });
});

// ✅ API to get both total users & active users in one request
app.get("/api/user-stats", authenticateToken, (req, res) => {
  db.query("SELECT COUNT(*) AS totalUsers FROM users", (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    const totalUsers = results[0].totalUsers;
    res.json({ totalUsers, activeUsers: activeUsers.size });
  });
});

// Recent signups API endpoint
app.get("/api/recent-signups", authenticateToken, (req, res) => {
  // Modified query to remove created_at/joinedDate
  const query = "SELECT id, name, email FROM users ORDER BY id DESC LIMIT 5";
  
  db.query(query, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    
    res.json({ recentUsers: results });
  });
});

// User activity timeline endpoint
app.get("/api/user-activity", authenticateToken, (req, res) => {
  // This would typically come from a log table or analytics database
  // For demonstration, we'll generate sample data
  const today = new Date();
  const activity = [];
  
  // Generate sample data for the last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    activity.push({
      date: date.toISOString().split('T')[0],
      activeUsers: Math.floor(Math.random() * 50) + 10 // Random number between 10-60
    });
  }
  
  res.json({ activity });
});

// Active time metrics endpoint
app.get("/api/active-time", authenticateToken, (req, res) => {
  // This would typically come from session data or analytics
  // For demonstration, we'll provide sample data
  res.json({
    activeTime: {
      today: Math.floor(Math.random() * 120) + 30, // 30-150 minutes
      week: Math.floor(Math.random() * 500) + 200, // 200-700 minutes
      month: Math.floor(Math.random() * 2000) + 800 // 800-2800 minutes
    }
  });
});

// New endpoints for user-type and platform statistics
app.get("/api/user-types", authenticateToken, (req, res) => {
  // This would ideally come from your database with proper queries
  // For now, we'll provide a sample implementation
  db.query("SELECT COUNT(*) AS totalUsers FROM users", (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    
    const totalUsers = results[0].totalUsers;
    
    // Calculate approximate distributions based on total users
    // In a real app, you'd query this data from your database
    const regularUsers = Math.floor(totalUsers * 0.8);
    const premiumUsers = Math.floor(totalUsers * 0.15);
    const adminUsers = Math.floor(totalUsers * 0.05);
    
    res.json({
      userTypes: [
        { type: "Regular Users", count: regularUsers, icon: "👤" },
        { type: "Premium Users", count: premiumUsers, icon: "⭐" },
        { type: "Admin Users", count: adminUsers, icon: "👑" }
      ]
    });
  });
});

app.get("/api/platform-usage", authenticateToken, (req, res) => {
  // This would ideally come from your database with proper queries
  // For now, we'll provide a sample implementation
  db.query("SELECT COUNT(*) AS totalUsers FROM users", (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    
    const totalUsers = results[0].totalUsers;
    
    // Calculate approximate distributions based on total users
    // In a real app, you'd query this data from your database
    res.json({
      platformData: [
        { platform: "Web App", users: Math.floor(totalUsers * 0.45) },
        { platform: "Mobile App", users: Math.floor(totalUsers * 0.35) },
        { platform: "Desktop App", users: Math.floor(totalUsers * 0.20) }
      ]
    });
  });
});
// API to get basic request count
app.get("/api/request-count", (req, res) => {
  res.json({ 
    totalRequests: requestStats.total,
    lastReset: requestStats.lastReset
  });
});

// API to get detailed request stats (with authentication)
app.get("/api/request-stats", authenticateToken, (req, res) => {
  res.json({
    totalRequests: requestStats.total,
    byEndpoint: requestStats.byEndpoint,
    byMethod: requestStats.byMethod,
    lastReset: requestStats.lastReset
  });
});

// API to reset request stats (with authentication)
app.post("/api/reset-request-stats", authenticateToken, (req, res) => {
  requestStats.total = 0;
  requestStats.byEndpoint = {};
  requestStats.byMethod = {};
  requestStats.lastReset = new Date();
  
  res.json({ message: "Request stats reset successfully", timestamp: requestStats.lastReset });
});
// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);

// Set up WebSocket
const { wss, sendToUser } = setupWebSocket(server);
app.set("sendToUser", sendToUser);

// Port Setup
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});