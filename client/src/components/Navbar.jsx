// src/components/Navbar.jsx
import React, { useState } from 'react'; // <-- 1. Import useState
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { logout, notificationCount } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // <-- 2. Add state

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false); // Close menu on logout
    navigate('/login');
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const navLinkStyles = ({ isActive }) => {
    return isActive ? 'nav-link active' : 'nav-link';
  };

  return (
    <nav className="navbar">
      <NavLink to="/" className="nav-logo" onClick={closeMenu}>
        SlotSwapper
      </NavLink>

      {/* --- 3. Add Hamburger Button (visible on mobile) --- */}
      <button className="hamburger" onClick={() => setIsMenuOpen(!isMenuOpen)}>
        {isMenuOpen ? (
          /* Close Icon (X) */
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          /* Menu Icon (☰) */
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )}
      </button>

      {/* --- 4. This wrapper will be the mobile menu --- */}
      <div className={isMenuOpen ? "nav-menu open" : "nav-menu"}>
        <div className="nav-links">
          <NavLink to="/" className={navLinkStyles} onClick={closeMenu}>
            My Dashboard
          </NavLink>
          <NavLink to="/marketplace" className={navLinkStyles} onClick={closeMenu}>
            Marketplace
          </NavLink>
          <NavLink to="/requests" className={navLinkStyles} onClick={closeMenu}>
            My Requests
            {notificationCount > 0 && (
              <span className="notification-badge">{notificationCount}</span>
            )}
          </NavLink>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Log Out
        </button>
      </div>
    </nav>
  );
}

export default Navbar;