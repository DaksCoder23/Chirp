import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./RequestAnalytics.css"; // You'll need to create this CSS file

const RequestAnalytics = () => {
  const [requestStats, setRequestStats] = useState({
    totalRequests: 0,
    byEndpoint: {},
    byMethod: {},
    lastReset: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
        
        // Fetch request stats
        const response = await axios.get("http://localhost:5000/api/request-stats", { headers });
        setRequestStats(response.data);
        setError(null);
      } catch (error) {
        console.error("Error fetching data:", error);
        if (error.response && error.response.status === 401) {
          setError("Authentication failed. Please log in again.");
          // Redirect to login page after token expires
          localStorage.removeItem('token');
          setTimeout(() => navigate('/'), 2000);
        } else {
          setError("Failed to load request data");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up polling to update stats periodically
    const interval = setInterval(fetchData, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval); // Cleanup on unmount
  }, [navigate]);

  // Reset request stats
  const handleReset = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await axios.post("http://localhost:5000/api/reset-request-stats", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh the stats
      window.location.reload();
    } catch (error) {
      console.error("Error resetting stats:", error);
      setError("Failed to reset stats");
    }
  };

  // Format the last reset date
  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Create endpoint list
  const endpointList = Object.entries(requestStats.byEndpoint || {})
    .sort((a, b) => b[1] - a[1]) // Sort by count in descending order
    .slice(0, 10); // Only show top 10

  // Create method list
  const methodList = Object.entries(requestStats.byMethod || {})
    .sort((a, b) => b[1] - a[1]); // Sort by count in descending order

  return (
    <div className="request-analytics-container">
      <h1>Server Request Analytics</h1>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading request data...</p>
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
              <h2>Total Requests</h2>
              <p className="stat-count">{requestStats.totalRequests}</p>
              <p className="stat-info">Since {formatDate(requestStats.lastReset)}</p>
            </div>
          </div>

          {/* Method Distribution */}
          <div className="section-container">
            <h2 className="section-title">Requests by HTTP Method</h2>
            <div className="method-stats">
              {methodList.map(([method, count], index) => (
                <div key={index} className="method-stat-item">
                  <div className={`method-badge method-${method.toLowerCase()}`}>{method}</div>
                  <div className="method-count">{count}</div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${(count / requestStats.totalRequests) * 100}%`,
                        backgroundColor: method === 'GET' ? '#4CAF50' : 
                                          method === 'POST' ? '#2196F3' : 
                                          method === 'PUT' ? '#FF9800' :
                                          method === 'DELETE' ? '#F44336' : '#9C27B0'
                      }}
                    ></div>
                  </div>
                  <p className="progress-percentage">
                    {((count / requestStats.totalRequests) * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Endpoints */}
          <div className="section-container">
            <h2 className="section-title">Top Requested Endpoints</h2>
            <div className="endpoints-list">
              {endpointList.length > 0 ? (
                <table className="endpoints-table">
                  <thead>
                    <tr>
                      <th>Endpoint</th>
                      <th>Requests</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpointList.map(([endpoint, count], index) => (
                      <tr key={index}>
                        <td className="endpoint-path">{endpoint}</td>
                        <td className="endpoint-count">{count}</td>
                        <td className="endpoint-percentage">
                          {((count / requestStats.totalRequests) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-data">No endpoint data available</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="section-container">
            <h2 className="section-title">Actions</h2>
            <div className="quick-actions">
              <button className="action-button" onClick={handleReset}>
                <span className="action-icon">🔄</span>
                <span>Reset Stats</span>
              </button>
              <button className="action-button" onClick={() => window.location.reload()}>
                <span className="action-icon">⟳</span>
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

export default RequestAnalytics;