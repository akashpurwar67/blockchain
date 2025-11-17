import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Login.css';

interface LoginProps {
  onLogin: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [userId, setUserId] = useState('admin1');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Login] Admin login attempt');
    setError('');
    setLoading(true);

    try {
      // Clear cookies to avoid "Request Header Fields Too Large" error
      document.cookie.split(';').forEach((c) => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });

      console.log('[Login] Sending login request to /auth/login');
      const response = await axios.post(
        'http://localhost:4000/auth/login',
        {
          userId,
          password,
          mspID: 'NITWarangalMSP',
        },
        {
          // Disable credentials to avoid sending large cookies
          withCredentials: false,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[Login] Login response:', response.data);
      const { token } = response.data;
      console.log('[Login] Token received, calling onLogin callback');
      onLogin(token);
      console.log('[Login] onLogin called, navigating to home');
      navigate('/');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Login failed';
      console.error('[Login] Login error:', errorMsg);
      console.error('[Login] Full error:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🎓 Academic Records System</h1>
        <p className="subtitle">NIT Warangal Blockchain Certificates</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>🏛️ Admin Login</h3>
            <p className="form-hint">Create and manage academic certificates on blockchain</p>

            <div className="form-group">
              <label>User ID</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your admin ID"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? '⏳ Logging in...' : '🚀 Login as Admin'}
          </button>
        </form>

        <div className="demo-section">
          <h4>Demo Credentials</h4>
          <div className="demo-options">
            <div className="demo-item">
              <strong>🏛️ Admin:</strong>
              <small>ID: admin1 | Password: admin123</small>
            </div>
          </div>
        </div>

        <div className="role-info">
          <h4>Admin Access</h4>
          <div className="role-details">
            <ul>
              <li>✓ Create new student records</li>
              <li>✓ Issue certificates on blockchain</li>
              <li>✓ Manage academic records</li>
              <li>✓ View all student data</li>
            </ul>
          </div>
        </div>

        <div className="verifier-info">
          <h4>🔍 Verify Certificates</h4>
          <p>No login needed! Anyone can verify certificates using the verification code.</p>
          <a href="/verify/demo" className="verify-link">
            Try Verification →
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
