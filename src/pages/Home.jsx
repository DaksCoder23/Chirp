import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Home.css";

const Home = () => {
  const navigate = useNavigate();
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [totalRes, activeRes] = await Promise.all([
          axios.get("/api/users/count"),  // Get total users from MySQL
          axios.get("/api/active-users-count"),  // Get active users from memory
        ]);

        setTotalUsers(totalRes.data.totalUsers);
        setActiveUsers(activeRes.data.activeUsers);
      } catch (error) {
        console.error("Error fetching user counts:", error);
      }
    };

    fetchCounts();
  }, []);

  return (
    <div className="home-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <button className="manage-user-btn">Manage Users</button>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Navbar */}
        <nav className="navbar">
          <ul>
            <li><a href="#about">About</a></li>
            <li>
              <a onClick={() => navigate("/MessageBoard")} style={{ cursor: "pointer" }}>
                Messages
              </a>
            </li>
          </ul>
        </nav>

        {/* Tiles Section */}
        <div className="tiles-container">
          <div className="tile" onClick={() => navigate("/active-users")}>
            <h3>Active Users</h3>
            <p>{activeUsers} </p>
          </div>
          <div className="tile">Requests</div>
          <div className="tile">Tile 3</div>
          <div className="tile">Tile 4</div>
        </div>
      </div>
    </div>
  );
};

export default Home;
