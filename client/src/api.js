// src/api.js
import axios from 'axios';

// Create an axios instance with a base URL
const api = axios.create({
  baseURL: 'http://localhost:4000/api'
});

// This is an "interceptor"
// It will attach the JWT token to *every* request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;