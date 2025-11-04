// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  // --- ADD THIS NEW STATE ---
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // --- ADD THIS NEW FUNCTION ---
  // It fetches the number of incoming requests
  const fetchNotificationCount = useCallback(async () => {
    try {
      const response = await api.get('/swap/requests/incoming');
      setNotificationCount(response.data.length);
    } catch (error) {
      // Don't show an error, just set to 0
      setNotificationCount(0);
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        // --- CALL THE NEW FUNCTION ON LOAD ---
        await fetchNotificationCount();
        
        // A simple way to get user data without another API call
        // We decode the token (this is safe on the client)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUser(payload.user);
        } catch (e) {
          console.error("Invalid token:", e);
          // Handle invalid token if necessary (e.g., logout)
        }

      }
      setLoading(false);
    };
    initializeAuth();
  }, [token, fetchNotificationCount]);

  const register = async (name, email, password) => {
    await api.post('/auth/register', { name, email, password });
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;
    setToken(token);
    setUser(user);
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    // --- RESET COUNT ON LOGOUT ---
    setNotificationCount(0); 
    localStorage.removeItem('token');
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    loading,
    // --- EXPORT THE COUNT AND FUNCTION ---
    notificationCount,
    fetchNotificationCount,
    register,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};