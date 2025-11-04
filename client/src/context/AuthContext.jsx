// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api';

// 1. Create the Context
const AuthContext = createContext();

// 2. Create the Provider (the "bubble" component)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in (when app reloads)
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // You could add a 'GET /api/auth/me' endpoint to verify the token
      // and get user data, but for this challenge, we'll just decode it.
      // For simplicity, we'll just set loading to false.
      // In a real app, you'd fetch user data here.
      setLoading(false); 
    } else {
      setLoading(false);
    }
  }, [token]);

  // Register function
  const register = async (name, email, password) => {
    // We call our backend register endpoint
    await api.post('/auth/register', { name, email, password });
  };

  // Login function
  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });

    // Get token and user from response
    const { token, user } = response.data;

    // Store in state
    setToken(token);
    setUser(user);

    // Store token in localStorage (so it persists on refresh)
    localStorage.setItem('token', token);
  };

  // Logout function
  const logout = () => {
    // Clear state
    setUser(null);
    setToken(null);

    // Remove from localStorage
    localStorage.removeItem('token');
  };

  // This is what the "bubble" provides to its children
  const value = {
    user,
    token,
    isAuthenticated: !!token,
    loading,
    register,
    login,
    logout,
  };

  // Render the children (the rest of the app) inside the provider
  // We show "Loading..." until we've checked for a token
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 3. Create a helper "hook" to easily use the context
export const useAuth = () => {
  return useContext(AuthContext);
};