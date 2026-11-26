import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient, tokenStorage } from '../api/client';
import type { ApiEnvelope, User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiClient.get<ApiEnvelope<User>>('/users/profile');
      setUser(res.data.data);
    } catch {
      tokenStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
    const handleExpired = () => setUser(null);
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [refreshProfile]);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post<
      ApiEnvelope<{ user: User; accessToken: string; refreshToken: string }>
    >('/auth/login', { email, password });
    const { user: loggedInUser, accessToken, refreshToken } = res.data.data;
    tokenStorage.setTokens(accessToken, refreshToken);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (payload: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => {
    const res = await apiClient.post<
      ApiEnvelope<{ user: User; accessToken: string; refreshToken: string }>
    >('/auth/register', payload);
    const { user: newUser, accessToken, refreshToken } = res.data.data;
    tokenStorage.setTokens(accessToken, refreshToken);
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore network/auth error on logout
    } finally {
      tokenStorage.clear();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.role === 'ADMIN',
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
