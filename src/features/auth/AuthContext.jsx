import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '@/services/auth';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Subscribe to auth state updates
    const unsubscribe = authService.onAuthStateChanged((user) => {
      if (mounted) {
        setCurrentUser(user);
      }
    });

    // Check current session from backend
    authService.getCurrentUser()
      .then((user) => {
        if (mounted) {
          setCurrentUser(user);
        }
      })
      .catch(() => {
        if (mounted) {
          setCurrentUser(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const u = await authService.login(credentials);
      toast.success(`Welcome back, ${u.name}`);
      return u;
    } catch (err) {
      toast.error(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const u = await authService.register(userData);
      toast.success('Account created successfully');
      return u;
    } catch (err) {
      toast.error(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (payload) => {
    setLoading(true);
    try {
      const u = await authService.loginWithGoogle(payload);
      toast.success(`Signed in as ${u.name}`);
      return u;
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    toast.success('Signed out');
  };

  const value = {
    user: currentUser,
    role: currentUser?.role || 'guest',
    isAuthenticated: !!currentUser,
    isAgent: currentUser?.role === 'agent',
    isAdmin: currentUser?.role === 'admin',
    isUser: currentUser?.role === 'user',
    isGuest: !currentUser,
    isVerifiedAgent: currentUser?.role === 'agent' && !!currentUser?.isVerified,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
