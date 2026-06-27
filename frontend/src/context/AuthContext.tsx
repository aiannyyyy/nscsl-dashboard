import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import authService from '../services/authService';
import { useQueryClient } from '@tanstack/react-query';
import { isMockMode, MOCK_TOKEN } from '../mocks/config';
import { MOCK_USER } from '../mocks/data/mockFixtures';

// Define user roles
export type UserRole = 'admin' | 'super-user' | 'user';

// Define departments
export type Department = 'administrator' | 'admin' | 'laboratory' | 'followup' | 'program' | 'all';

// Define user interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: Department;
  /** Job title from login API (e.g. Team Captain) */
  position?: string;
}

// Define auth context interface
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  error: string | null;
  hasPermission: (action: 'read' | 'create' | 'update' | 'delete') => boolean;
  isAdmin: () => boolean;
  isSuperUser: () => boolean;
  isRegularUser: () => boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient()

  // Check if user is already logged in on mount
  useEffect(() => {
    console.log('🟢 [AUTH] AuthProvider mounted, checking auth status...');
    checkAuthStatus();
  }, []);

  // Check authentication status (e.g., from localStorage or token)
  const checkAuthStatus = async () => {
    console.log('🟢 [AUTH] Checking auth status...');
    try {
      if (isMockMode()) {
        localStorage.setItem('authToken', MOCK_TOKEN);
        localStorage.setItem('user', JSON.stringify(MOCK_USER));
        setUser(MOCK_USER);
        return;
      }

      const token = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');
      
      console.log('🟢 [AUTH] Token exists:', !!token);
      console.log('🟢 [AUTH] Stored user exists:', !!storedUser);
      
      if (token && storedUser) {
        const userData = JSON.parse(storedUser);
        console.log('🟢 [AUTH] Restoring user from localStorage:', userData);
        setUser(userData);
        console.log('🟢 [AUTH] User state restored:', userData);
      } else {
        console.log('🟢 [AUTH] No stored credentials found');
      }
    } catch (err) {
      console.error('🔴 [AUTH] Auth check failed:', err);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setIsLoading(false);
      console.log('🟢 [AUTH] Auth check completed, isLoading set to false');
    }
  };

  // Login function - Returns User
  const login = async (username: string, password: string): Promise<User> => {
    console.log('🟢 [AUTH] Login function called');
    console.log('🟢 [AUTH] Username:', username);
    
    setIsLoading(true);
    setError(null);

    try {
      console.log('🟢 [AUTH] Calling authService.login...');
      console.time('⏱️ AuthService Call');
      
      // Call the auth service API with username instead of email
      const response = await authService.login({ username, password });
      
      console.timeEnd('⏱️ AuthService Call');
      console.log('🟢 [AUTH] Response received:', response);
      
      // Store token and user data
      console.log('🟢 [AUTH] Storing token and user data...');
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      console.log('🟢 [AUTH] Data stored in localStorage');
      console.log('🟢 [AUTH] Stored user data:', JSON.stringify(response.user));
      
      setUser(response.user);
      console.log('🟢 [AUTH] User state updated:', response.user);
      
      // Return the user data
      return response.user;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      console.error('🔴 [AUTH] Login error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
      console.log('🟢 [AUTH] Login function completed');
    }
  };

  // Logout function
  const logout = () => {
    if (isMockMode()) {
      queryClient.clear();
      return;
    }
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    setUser(null)
    setError(null)
    queryClient.clear()
  }

  // Check if user has permission for an action
  const hasPermission = (action: 'read' | 'create' | 'update' | 'delete'): boolean => {
    if (!user) return false;

    switch (user.role) {
      case 'admin':
        return true; // Admin has all permissions
      case 'super-user':
        return true; // Super user has all permissions
      case 'user':
        // Regular user can only read and create, no update/delete
        return action === 'read' || action === 'create';
      default:
        return false;
    }
  };

  // Role check helpers
  const isAdmin = (): boolean => user?.role === 'admin';
  const isSuperUser = (): boolean => user?.role === 'super-user';
  const isRegularUser = (): boolean => user?.role === 'user';

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    error,
    hasPermission,
    isAdmin,
    isSuperUser,
    isRegularUser,
  };

  console.log('🟢 [AUTH] Provider rendering with state:', {
    isAuthenticated: !!user,
    isLoading,
    userName: user?.name,
    userDept: user?.department
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};