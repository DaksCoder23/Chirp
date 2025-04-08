import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Home from "./pages/Home";
import ActiveUsers from "./pages/ActiveUsers";
import RequestAnalytics from "./pages/RequestAnalytics";

const App = () => {
  return (
    <div className="container">
      {/* Chirp Logo in the top left corner */}
      <div className="logo-container">
        <img src="/Chirp-logo.png" alt="Chirp Logo" className="logo" />
      </div>

      <Routes>
        {/* Route for Home page to take full screen */}
        <Route path="/home" element={<Home />} />
        
        <Route path="/active-users" element={<ActiveUsers />} />
        <Route path="/request-analytics" element={<RequestAnalytics />} />
        {/* Login Route */}
        <Route
          path="/"
          element={
            <div className="split-container">
              {/* Left Side - Login */}
              <div className="left">
                <Login />
              </div>

              {/* Right Side - Isometric Image */}
              <div className="right">
                <img
                  src="/Chirp-isometric.png"
                  alt="Isometric"
                  className="isometric-img"
                />
              </div>
            </div>
          }
        />

        {/* Signup Route */}
        <Route
          path="/signup"
          element={
            <div className="split-container">
              {/* Left Side - Signup */}
              <div className="left">
                <Signup />
              </div>

              {/* Right Side - Isometric Image */}
              <div className="right">
                <img
                  src="/Chirp-isometric.png"
                  alt="Isometric"
                  className="isometric-img"
                />
              </div>
            </div>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
