// src/components/Navbar.js
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="navbar">
      <NavLink to="/" className="brand" aria-label="AI Apply home">
        AI<span>Apply</span>
      </NavLink>

      <nav aria-label="Main navigation">
        <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")} end>
          Home
        </NavLink>
        <NavLink to="/analyse" className={({ isActive }) => (isActive ? "active" : "")}>
          New Analysis
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? "active" : "")}>
          History
        </NavLink>

        {currentUser && (
          <div className="nav-actions">
            <span className="user-pill">
              {currentUser.displayName?.split(" ")[0] || "User"}
            </span>
            <button className="logout-btn" onClick={handleLogout} type="button">
              Logout
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}
