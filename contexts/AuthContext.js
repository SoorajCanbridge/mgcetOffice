'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, isAuthenticated, logoutUser as removeAuthToken } from '@/lib/auth';
import { resolveUserPermissions } from '@/lib/rbac';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

/**
 * Normalize /auth/me response into a single user object with permissions.
 * Backend may send: { user: {...}, permissions: [...] } or { data: { user: {...}, permissions: [...] } } or user.permissions.
 */
function normalizeMeResponse(response) {
  if (!response || typeof response !== 'object') return null;
  const data = response?.data ?? response;
  const user = data?.user ?? (data?.id != null || data?.email != null ? data : null);
  if (!user) return null;
  const permissionsFromApi = data?.permissions ?? user?.permissions;
  const userWithPermissions = permissionsFromApi != null
    ? { ...user, permissions: permissionsFromApi }
    : user;
  return userWithPermissions;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const decorateUser = (rawUser) => {
    if (!rawUser) return null;
    const permissions = resolveUserPermissions(rawUser);
    return {
      ...rawUser,
      permissions,
    };
  };

  const checkAuth = async () => {
    if (isAuthenticated()) {
      try {
        const userData = await getCurrentUser();
        const u = normalizeMeResponse(userData) ?? userData?.data?.user ?? userData?.user ?? userData;
        setUser(decorateUser(u));
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      }
    }
    setLoading(false);
  };

  const login = (userData, token) => {
    const u = normalizeMeResponse(userData) ?? userData?.user ?? userData;
    setUser(decorateUser(u));
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    router.push('/login');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
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

