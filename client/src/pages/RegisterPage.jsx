// src/pages/RegisterPage.jsx
import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import LiquidEther from '../components/LiquidEther';

const PasswordChecklist = ({ password }) => {
  const checks = useMemo(() => {
    return {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^a-zA-Z0-9]/.test(password),
    };
  }, [password]);

  const allValid = Object.values(checks).every(Boolean);

  return (
    <ul className="password-checklist">
      <li className={checks.length ? 'valid' : ''}>At least 8 characters</li>
      <li className={checks.lowercase ? 'valid' : ''}>One lowercase letter (a-z)</li>
      <li className={checks.uppercase ? 'valid' : ''}>One uppercase letter (A-Z)</li>
      <li className={checks.number ? 'valid' : ''}>One number (0-9)</li>
      <li className={checks.special ? 'valid' : ''}>One special character (!@#...)</li>
    </ul>
  );
};

function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false); // <-- ADD THIS
  const { register } = useAuth();
  const navigate = useNavigate();

  const isPasswordValid = useMemo(() => {
    return (
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^a-zA-Z0-9]/.test(password)
    );
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // --- 4. UPDATE THE VALIDATION CHECK ---
    if (!isPasswordValid) {
      setError('Password does not meet all requirements.');
      return;
    }
    
    try {
      await register(name, email, password);
      navigate('/login');
    } catch (err) {
      setError('Failed to register. Email might be in use.');
    }
  };

  return (
    <div className="auth-page">
      {/* --- ADD THIS COMPONENT FOR THE BACKGROUND --- */}
    <div className="auth-background">
      <LiquidEther colors={[ '#5227FF', '#FF9FFC', '#B19EEF' ]} />
    </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Sign Up</h2>
        {error && <p className="error">{error}</p>}
        <div>
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* --- THIS BLOCK IS REPLACED --- */}
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
        {/* --- END OF REPLACED BLOCK --- */}
        
        <button type="submit">Sign Up</button>
        <p>
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;