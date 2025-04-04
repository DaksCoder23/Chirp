import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ActiveUsers.css";

const ActiveUsers = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        setLoading(true);
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        const response = await axios.get("http://localhost:5000/api/user-stats", {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined
          }
        });
        
        setTotalUsers(response.data.totalUsers);
        setActiveUsers(response.data.activeUsers);
        setError(null);
      } catch (error) {
        console.error("Error fetching user stats:", error);
        setError("Failed to load user statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, []);

  return (
    <div className="active-users-container">
      <h1>User Statistics</h1>
      
      {loading ? (
        <p className="loading-message">Loading statistics...</p>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <div className="stats-container">
          <div className="stat-tile">
            <h2>Total Users</h2>
            <p className="stat-count">{totalUsers}</p>
          </div>
          <div className="stat-tile">
            <h2>Active Users</h2>
            <p className="stat-count">{activeUsers}</p>
          </div>
        </div>
      )}
      
      <button onClick={() => navigate(-1)}>Back to Dashboard</button>
    </div>
  );
};

export default ActiveUsers;