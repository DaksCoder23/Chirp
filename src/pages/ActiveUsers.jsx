import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ActiveUsers.css";

const ActiveUsers = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentSignups, setRecentSignups] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [platformData, setPlatformData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError("Authentication required. Please log in.");
          setLoading(false);
          return;
        }
        
        const headers = {
          Authorization: `Bearer ${token}`
        };
        
        // Fetch multiple data sources in parallel
        const [statsResponse, signupsResponse, userTypesResponse, platformResponse] = await Promise.all([
          axios.get("http://localhost:5000/api/user-stats", { headers }),
          axios.get("http://localhost:5000/api/recent-signups", { headers }),
          axios.get("http://localhost:5000/api/user-types", { headers }),
          axios.get("http://localhost:5000/api/platform-usage", { headers })
        ]);
        
        setTotalUsers(statsResponse.data.totalUsers);
        setActiveUsers(statsResponse.data.activeUsers);
        setRecentSignups(signupsResponse.data.recentUsers || []);
        setUserTypes(userTypesResponse.data.userTypes || []);
        setPlatformData(platformResponse.data.platformData || []);
        setError(null);
      } catch (error) {
        console.error("Error fetching data:", error);
        if (error.response && error.response.status === 401) {
          setError("Authentication failed. Please log in again.");
          // Redirect to login page after token expires
          localStorage.removeItem('token');
          setTimeout(() => navigate('/login'), 2000);
        } else {
          setError("Failed to load user data");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Calculate activity percentage
  const calculateActivityPercentage = (active, total) => {
    return total > 0 ? ((active / total) * 100).toFixed(1) : 0;
  };

  return (
    <div className="active-users-container">
      <h1>User Analytics Dashboard</h1>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <>
          {/* Main Stats */}
          <div className="stats-container">
            <div className="stat-tile">
              <h2>Total Users</h2>
              <p className="stat-count">{totalUsers}</p>
            </div>
            <div className="stat-tile">
              <h2>Active Users</h2>
              <p className="stat-count">{activeUsers}</p>
              <p className="stat-percentage">
                {calculateActivityPercentage(activeUsers, totalUsers)}% of total
              </p>
            </div>
          </div>

          {/* User Distribution */}
          <div className="section-container">
            <h2 className="section-title">User Distribution</h2>
            <div className="user-stats">
              {userTypes.map((item, index) => (
                <div key={index} className="user-stat-item">
                  <div className="user-stat-icon">{item.icon}</div>
                  <div className="user-stat-info">
                    <h3>{item.type}</h3>
                    <p>{item.count}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Usage */}
          <div className="section-container">
            <h2 className="section-title">Platform Usage</h2>
            <div className="platform-usage">
              {platformData.map((platform, index) => (
                <div key={index} className="platform-item">
                  <div className="platform-info">
                    <h3>{platform.platform}</h3>
                    <p>{platform.users} users</p>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${(platform.users / totalUsers) * 100}%` }}
                    ></div>
                  </div>
                  <p className="progress-percentage">
                    {totalUsers > 0 ? ((platform.users / totalUsers) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Signups */}
          <div className="section-container">
            <h2 className="section-title">Recent Signups</h2>
            <div className="recent-users">
              {recentSignups.length > 0 ? (
                recentSignups.map((user, index) => (
                  <div key={index} className="user-card">
                    <div className="user-avatar" data-initial={user.name ? user.name[0] : "U"}></div>
                    <div className="user-info">
                      <h3>{user.name}</h3>
                      <p>{user.email}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-data">No recent signups</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="section-container">
            <h2 className="section-title">Quick Actions</h2>
            <div className="quick-actions">
              <button className="action-button">
                <span className="action-icon">📊</span>
                <span>Export User Data</span>
              </button>
              <button className="action-button">
                <span className="action-icon">📧</span>
                <span>Email All Users</span>
              </button>
              <button className="action-button" onClick={() => window.location.reload()}>
                <span className="action-icon">🔄</span>
                <span>Refresh Data</span>
              </button>
            </div>
          </div>
        </>
      )}
      
      <button className="back-button" onClick={() => navigate(-1)}>Back to Dashboard</button>
    </div>
  );
};

export default ActiveUsers;