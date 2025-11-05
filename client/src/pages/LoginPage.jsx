// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import '../AnimatedBackground.css';
import LiquidEther from '../components/LiquidEther';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // 1. ADD EMAIL VALIDATION FUNCTION
  const validateEmail = (email) => {
    // A simple regex for email validation
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 2. ADD CLIENT-SIDE VALIDATION CHECK
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      await login(email, password);
      navigate('/'); // Redirect to dashboard on success
    } catch (err) {
      // 3. ADD DETAILED ERROR HANDLING
      // We check the actual error message from the server
      const errorMsg = err.response?.data?.error || 'Failed to log in.';
      
      if (errorMsg.includes('Invalid credentials (email)')) {
        // This is the specific feature you asked for
        setError('No account found with this email. Please Sign Up.');
      } else if (errorMsg.includes('Invalid credentials (password)')) {
        setError('Incorrect password. Please try again.');
      } else {
        // Generic fallback error
        setError('Failed to log in. Please check your credentials.');
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background">
        <LiquidEther colors={[ '#5227FF', '#FF9FFC', '#B19EEF' ]} />
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Log In</h2>
        {error && <p className="error">{error}</p>}
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label>Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span 
              className="eye-icon" 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                /* Eye-slash icon */
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="icon-svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L12 12" />
                </svg>
              ) : (
                /* Eye-open icon */
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="icon-svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </span>
          </div>
        </div>

        <button type="submit">Log In</button>
        <p>
          Don't have an account? <Link to="/register">Sign Up</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;