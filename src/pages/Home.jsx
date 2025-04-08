import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Home.css";

const Home = () => {
  const navigate = useNavigate();
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [requestCount, setRequestCount] = useState(0); // New state for request count

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [totalRes, activeRes, requestRes] = await Promise.all([
          axios.get("/api/users/count"),  // Get total users from MySQL
          axios.get("/api/active-users-count"),  // Get active users from memory
          axios.get("/api/request-count"),  // Get request count
        ]);

        setTotalUsers(totalRes.data.totalUsers);
        setActiveUsers(activeRes.data.activeUsers);
        setRequestCount(requestRes.data.totalRequests);
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    };

    fetchCounts();
    
    // Optional: Set up polling to update request count periodically
    const interval = setInterval(fetchCounts, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem("token"); // Clear authentication token
    navigate("/"); // Redirect to login/signup
  };
  
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
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </nav>

        {/* Tiles Section */}
        <div className="tiles-container">
          <div className="tile" onClick={() => navigate("/active-users")}>
            <h3>Active Users</h3>
            <p>{activeUsers}</p>
          </div>
          <div className="tile" onClick={() => navigate("/request-analytics")}>
            <h3>Server Requests</h3>
            <p>{requestCount}</p>
          </div>
          <div className="tile">Tile 3</div>
          <div className="tile">Tile 4</div>
        </div>
        <div className="wave-footer"></div>
      </div>
    </div>
  );
};

export default Home;