// src/components/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">SlotSwapper</Link>
      <div className="nav-links">
        <Link to="/">My Dashboard</Link>
        <Link to="/marketplace">Marketplace</Link>
        <Link to="/requests">My Requests</Link>
      </div>
      <button onClick={handleLogout} className="logout-button">
        Log Out
      </button>
    </nav>
  );
}

export default Navbar;