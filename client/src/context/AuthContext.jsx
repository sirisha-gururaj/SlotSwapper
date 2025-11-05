// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // --- 1. ADD A REF TO HOLD THE WEBSOCKET ---
  // A 'ref' won't change on re-renders and won't trigger them
  const ws = useRef(null);

  const fetchNotificationCount = useCallback(async () => {
    try {
      const response = await api.get('/swap/requests/incoming');
      setNotificationCount(response.data.length);
    } catch (error) {
      setNotificationCount(0);
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await fetchNotificationCount();

        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUser(payload.user);
        } catch (e) {
          console.error("Invalid token:", e);
        }

        // --- 2. ESTABLISH WEBSOCKET CONNECTION ---
        // Use 'ws:' (not wss:) for local development
        const renderURL = 'slotswapper-server.onrender.com'; // <-- PASTE YOUR URL (domain only)
        ws.current = new WebSocket(`wss://${renderURL}`);

        // 2a. On Open: Authenticate
        ws.current.onopen = () => {
          console.log('WebSocket: Connection opened.');
          // Send the auth token
          ws.current.send(JSON.stringify({ type: 'AUTH', token: token }));
        };

        // 2b. On Message: Listen for notifications
        ws.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('WebSocket: Message received:', message);

            // --- THIS IS THE NEW LOGIC ---

            // 1. Handle notification count updates
            if (message.type === 'NEW_REQUEST' || message.type === 'REQUEST_RESPONSE') {
              console.log('WebSocket: Notification received, refetching count.');
              fetchNotificationCount();
            }

            // 2. Handle page data refreshes
            // This now fires for all message types
            if (message.type === 'NEW_REQUEST' || message.type === 'REQUEST_RESPONSE' || message.type === 'MARKETPLACE_UPDATE') {
              console.log('WebSocket: Data refresh event, dispatching.');
              window.dispatchEvent(new Event('refetchData'));
            }
            // --- END OF NEW LOGIC ---

          } catch (e) {
            console.error('WebSocket: Error parsing message', e);
          }
        };

        // 2c. On Close: Handle closure
        ws.current.onclose = () => {
          console.log('WebSocket: Connection closed.');
        };

        // 2d. On Error: Handle errors
        ws.current.onerror = (error) => {
          console.error('WebSocket: Error:', error);
        };

      }
      setLoading(false);
    };
    initializeAuth();

    // --- 3. CLEANUP FUNCTION ---
    // This runs when the component unmounts or token changes
    return () => {
      if (ws.current) {
        ws.current.close(); // Close the connection
        ws.current = null;
      }
    };
  }, [token, fetchNotificationCount]); // Run this effect when 'token' changes

  const register = async (name, email, password) => {
    await api.post('/auth/register', { name, email, password });
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;
    // Setting the token will trigger the useEffect above
    setToken(token);
    setUser(user);
    localStorage.setItem('token', token);
  };

  const loginWithGoogle = async (googleCredential) => {
    // This calls our new backend endpoint
    const response = await api.post('/auth/google-login', { 
      token: googleCredential
    });
    
    // The rest is the same as normal login
    const { token, user } = response.data;
    setToken(token);
    setUser(user);
    localStorage.setItem('token', token);
  };

  const logout = () => {
    // --- 4. CLOSE WEBSOCKET ON LOGOUT ---
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    setUser(null);
    setToken(null);
    setNotificationCount(0);
    localStorage.removeItem('token');
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    loading,
    notificationCount,
    fetchNotificationCount,
    register,
    login,
    loginWithGoogle,
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