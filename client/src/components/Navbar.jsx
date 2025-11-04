// src/components/Navbar.jsx
import React from 'react';
// CHANGE: Import NavLink instead of Link
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { logout, notificationCount } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // This function adds the 'active' class if the link is the current page
  const navLinkStyles = ({ isActive }) => {
    return isActive ? 'nav-link active' : 'nav-link';
  };

  return (
    <nav className="navbar">
      <NavLink to="/" className="nav-logo">SlotSwapper</NavLink>
      <div className="nav-links">
        {/* CHANGE: Use NavLink for all links */}
        <NavLink to="/" className={navLinkStyles}>My Dashboard</NavLink>
        <NavLink to="/marketplace" className={navLinkStyles}>Marketplace</NavLink>
        <NavLink to="/requests" className={navLinkStyles}>
            My Requests
            {/* The badge will only show if count > 0 */}
            {notificationCount > 0 && (
                <span className="notification-badge">{notificationCount}</span>
        )}
        </NavLink>
      </div>
      <button onClick={handleLogout} className="logout-button">
        Log Out
      </button>
    </nav>
  );
}

export default Navbar;