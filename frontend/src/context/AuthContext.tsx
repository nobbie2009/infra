import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api, { storeTokens, getStoredTokens, clearTokens, storeUser, getStoredUser } from '../lib/api';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'developer' | 'viewer';
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = getStoredUser();
        const tokens = getStoredTokens();

        if (storedUser && tokens) {
          setUser(storedUser);
        }
      } catch (err) {
        // Silently fail if user data is corrupted
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', {
        username: username.trim(),
        password,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Login failed');
      }

      const { user: userData, accessToken, refreshToken } = response.data.data;

      storeTokens({ accessToken, refreshToken });
      storeUser(userData);
      setUser(userData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/register', {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Registration failed');
      }

      // Auto-login after registration
      await login(username, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [login]);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Continue with logout even if API call fails
    } finally {
      clearTokens();
      setUser(null);
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');

      if (response.data.success) {
        const userData = response.data.data;
        storeUser(userData);
        setUser(userData);
      }
    } catch (err) {
      // If refresh fails, clear auth
      clearTokens();
      setUser(null);
      throw err;
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
