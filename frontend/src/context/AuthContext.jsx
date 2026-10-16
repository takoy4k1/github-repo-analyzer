/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('repomind_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch (error) {
        console.error('Failed to load user session:', error.message);
        localStorage.removeItem('repomind_token');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
      
      localStorage.setItem('repomind_token', token);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check your credentials.'
      };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      const { token, user: userData } = response.data;

      localStorage.setItem('repomind_token', token);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed. Try again.'
      };
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      return response.data;
    } catch (err) {
      console.error('Failed to refresh user:', err.message);
      return null;
    }
  };

  const loginWithGitHub = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    window.location.href = `${backendUrl}/auth/github`;
  };

  const connectGitHub = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    const token = localStorage.getItem('repomind_token');
    window.location.href = `${backendUrl}/auth/github?token=${encodeURIComponent(token || '')}`;
  };

  const disconnectGitHub = async () => {
    try {
      await api.delete('/auth/github/disconnect');
      await refreshUser();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to disconnect GitHub account.'
      };
    }
  };

  const setSession = (token, userData) => {
    if (token) {
      localStorage.setItem('repomind_token', token);
    }
    if (userData) {
      setUser(userData);
    }
  };

  const logout = () => {
    localStorage.removeItem('repomind_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      connectGitHub,
      loginWithGitHub,
      disconnectGitHub,
      setSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
