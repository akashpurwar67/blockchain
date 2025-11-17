import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Verify from './pages/Verify';
import './App.css';

interface TokenPayload {
  mspID?: string;
  userId?: string;
  iat?: number;
  exp?: number;
}

// Utility function to decode JWT token
const decodeToken = (token: string): TokenPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const decoded = JSON.parse(atob(parts[1]));
    return decoded;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

// Determine user role based on mspID
const getUserRole = (mspID?: string): 'admin' | 'unknown' => {
  if (!mspID) return 'unknown';

  if (mspID === 'Org1MSP' || mspID === 'NITWarangalMSP') {
    return 'admin';
  }

  return 'unknown';
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!localStorage.getItem('token')
  );
  const [token, setToken] = useState<string>(localStorage.getItem('token') || '');
  const [userRole, setUserRole] = useState<'admin' | 'unknown'>('unknown');

  // Update user role whenever token changes
  useEffect(() => {
    console.log('[App] Token changed, updating role');
    if (token) {
      const decoded = decodeToken(token);
      console.log('[App] Decoded token:', decoded);
      const role = getUserRole(decoded?.mspID);
      console.log('[App] User role determined:', role);
      setUserRole(role);
    } else {
      console.log('[App] No token, role set to unknown');
      setUserRole('unknown');
    }
  }, [token]);

  const handleLogin = (newToken: string) => {
    console.log('[App] handleLogin called');
    console.log('[App] Token received (first 20 chars):', newToken.substring(0, 20) + '...');
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    console.log('[App] Login state updated');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setIsAuthenticated(false);
    setUserRole('unknown');
  };

  // Route based on user role
  const getRoleBasedRoute = () => {
    console.log('[App] getRoleBasedRoute called - isAuthenticated:', isAuthenticated, 'userRole:', userRole);
    if (!isAuthenticated || !token) {
      console.log('[App] Not authenticated, redirecting to login');
      return <Navigate to="/login" />;
    }

    switch (userRole) {
      case 'admin':
        console.log('[App] Routing to Dashboard (admin)');
        return <Dashboard token={token} onLogout={handleLogout} />;
      default:
        console.log('[App] Unknown role, redirecting to login');
        return <Navigate to="/login" />;
    }
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={<Login onLogin={handleLogin} />}
        />
        <Route
          path="/"
          element={getRoleBasedRoute()}
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated && token && userRole === 'admin' ? (
              <Dashboard token={token} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/verify/:verificationCode"
          element={<Verify />}
        />
      </Routes>
    </Router>
  );
};

export default App;
