// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout and Auth Pages
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// App Pages
import DashboardPage from './pages/DashboardPage';
import MarketplacePage from './pages/MarketplacePage';
import RequestsPage from './pages/RequestsPage';

import './App.css'; // We'll add new styles to this

// This is a special component to protect our routes
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    // If not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Routes for the main app (protected) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Child routes of AppLayout. These will render inside the 'Outlet' */}
        <Route index element={<DashboardPage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="requests" element={<RequestsPage />} />
      </Route>

      {/* Routes for authentication (public) */}
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