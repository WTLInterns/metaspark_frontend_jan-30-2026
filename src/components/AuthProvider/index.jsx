'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

const AUTH_USER_KEY = 'swiftflow-user';
const AUTH_TOKEN_KEYS = ['swiftflow-token', 'auth-token'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we're in the browser environment
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem(AUTH_USER_KEY);
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (error) {
          console.error('Failed to parse user data:', error);
          localStorage.removeItem(AUTH_USER_KEY);
        }
      }
      setLoading(false);
    }
  }, []);

  const login = (userData) => {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUTH_USER_KEY);
        AUTH_TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
        sessionStorage.setItem('show-logout-success', '1');
        sessionStorage.setItem('logout-reason', 'user');
        sessionStorage.removeItem('show-login-success');
      } finally {
        setUser(null);
        window.location.href = '/login';
      }
      return;
    }

    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
