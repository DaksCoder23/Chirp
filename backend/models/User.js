const db = require("../config/db");

// Create Users Table if not exists
const createUserTable = () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50),
      email VARCHAR(100) UNIQUE,
      mobile VARCHAR(15),
      password VARCHAR(255)
    )
  `;
  db.query(query, (err, result) => {
    if (err) {
      console.error("Error creating users table:", err);
      return;
    }
    console.log("Users table created or already exists.");
  });
};

module.exports = createUserTable;
