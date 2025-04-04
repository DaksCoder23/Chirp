const mysql = require("mysql2");

// Create DB connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root@123", 
  database: "auth_db",
});

// Connect to DB
db.connect((err) => {
  if (err) {
    console.error("Error connecting to DB:", err);
    return;
  }
  console.log("MySQL connected...");
});

module.exports = db;
