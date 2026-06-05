// Auth Service - Handles all authentication-related API calls

// Debug: Log the environment variable
console.log('🔍 [ENV] VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('🔍 [ENV] All env vars:', import.meta.env);

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
console.log('🔍 [SERVICE] Using API_BASE_URL:', API_BASE_URL);

interface LoginCredentials {
  username: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super-user' | 'user';
  department: 'pdo' | 'admin' | 'laboratory' | 'followup' | 'it-job-order' | 'all';
  position?: string;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}

class AuthService {
  /**
   * Login user with username and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    console.log('🟡 [SERVICE] Login method called');
    console.log('🟡 [SERVICE] API_BASE_URL:', API_BASE_URL);
    
    const loginUrl = `${API_BASE_URL}/auth/login`;
    console.log('🟡 [SERVICE] Full login URL:', loginUrl);
    console.log('🟡 [SERVICE] Credentials:', { username: credentials.username, password: '***' });
    
    try {
      console.log('🟡 [SERVICE] Sending fetch request...');
      console.time('⏱️ Fetch Request');
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.timeEnd('⏱️ Fetch Request');
      console.log('🟡 [SERVICE] Response status:', response.status);
      console.log('🟡 [SERVICE] Response ok:', response.ok);
      console.log('🟡 [SERVICE] Response URL:', response.url);

      if (!response.ok) {
        console.log('🔴 [SERVICE] Response not OK, parsing error...');
        const errorData = await response.json();
        console.log('🔴 [SERVICE] Error data:', errorData);
        throw new Error(errorData.message || 'Login failed');
      }

      console.log('🟡 [SERVICE] Parsing successful response...');
      const data = await response.json();
      console.log('🟡 [SERVICE] Response data:', data);
      
      return data;
    } catch (error) {
      console.error('🔴 [SERVICE] Fetch error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      // Clear local storage regardless of API call success
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local storage even if API call fails
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  }

  /**
   * Verify token validity
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(token: string): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password reset request failed');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password reset failed');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;