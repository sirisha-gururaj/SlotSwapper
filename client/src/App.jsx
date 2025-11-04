// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { useAuth } from './context/AuthContext';

// Import our new CSS file (we'll create this next)
import './App.css'; 

// A simple placeholder for our main app page
function Dashboard() {
  const { logout } = useAuth();
  return (
    <div>
      <h1>Welcome to SlotSwapper!</h1>
      <button onClick={logout}>Log Out</button>
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? <Dashboard /> : <Navigate to="/login" />
        }
      />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />}
      />
    </Routes>
  );
}

export default App;