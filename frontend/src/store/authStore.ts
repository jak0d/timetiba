import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { authApi, LoginRequest, RegisterRequest, AuthResponse } from '../services/authApi';
import { LoadingState } from '../types/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthStoreState extends LoadingState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

interface AuthStoreActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  
  // State management
  setUser: (user: User | null) => void;
  setTokens: (token: string | null, refreshToken: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

type AuthStore = AuthStoreState & AuthStoreActions;

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        lastUpdated: null,

        login: async (credentials: LoginRequest) => {
          try {
            set({ isLoading: true, error: null });
            const response = await authApi.login(credentials);
            
            if (response.success && response.data) {
              const { token, refreshToken, user } = response.data;
              
              // Store token in localStorage for API client
              localStorage.setItem('authToken', token);
              
              set({
                user,
                token,
                refreshToken,
                isAuthenticated: true,
                isLoading: false,
                lastUpdated: new Date(),
              });
            } else {
              throw new Error(response.message || 'Login failed');
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Login failed',
              isLoading: false,
            });
            throw error;
          }
        },

        register: async (userData: RegisterRequest) => {
          try {
            set({ isLoading: true, error: null });
            const response = await authApi.register(userData);
            
            if (response.success && response.data) {
              const { token, refreshToken, user } = response.data;
              
              // Store token in localStorage for API client
              localStorage.setItem('authToken', token);
              
              set({
                user,
                token,
                refreshToken,
                isAuthenticated: true,
                isLoading: false,
                lastUpdated: new Date(),
              });
            } else {
              throw new Error(response.message || 'Registration failed');
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Registration failed',
              isLoading: false,
            });
            throw error;
          }
        },

        logout: async () => {
          try {
            set({ isLoading: true, error: null });
            
            // Call logout endpoint if token exists
            if (get().token) {
              await authApi.logout();
            }
            
            // Clear localStorage
            localStorage.removeItem('authToken');
            
            set({
              user: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          } catch (error) {
            // Even if logout fails, clear local state
            localStorage.removeItem('authToken');
            set({
              user: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        },

        refreshAuth: async () => {
          try {
            const { refreshToken } = get();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            set({ isLoading: true, error: null });
            const response = await authApi.refreshToken({ refreshToken });
            
            if (response.success && response.data) {
              const { token, refreshToken: newRefreshToken, user } = response.data;
              
              // Update token in localStorage
              localStorage.setItem('authToken', token);
              
              set({
                user,
                token,
                refreshToken: newRefreshToken,
                isAuthenticated: true,
                isLoading: false,
                lastUpdated: new Date(),
              });
            } else {
              throw new Error(response.message || 'Token refresh failed');
            }
          } catch (error) {
            // If refresh fails, logout user
            get().logout();
            throw error;
          }
        },

        getCurrentUser: async () => {
          try {
            set({ isLoading: true, error: null });
            const response = await authApi.getCurrentUser();
            
            if (response.success && response.data) {
              set({
                user: response.data,
                isLoading: false,
                lastUpdated: new Date(),
              });
            } else {
              throw new Error(response.message || 'Failed to get current user');
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to get current user',
              isLoading: false,
            });
          }
        },

        changePassword: async (oldPassword: string, newPassword: string) => {
          try {
            set({ isLoading: true, error: null });
            const response = await authApi.changePassword(oldPassword, newPassword);
            
            if (response.success) {
              set({
                isLoading: false,
                lastUpdated: new Date(),
              });
            } else {
              throw new Error(response.message || 'Failed to change password');
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to change password',
              isLoading: false,
            });
            throw error;
          }
        },

        forgotPassword: async (email: string) => {
          try {
            set({ isLoading: true, error: null });
            const response = await authApi.forgotPassword(email);
            
            if (response.success) {
              set({
                isLoading: false,
                lastUpdated: new Date(),
              });
            } else {
              throw new Error(response.message || 'Failed to send password reset email');
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to send password reset email',
              isLoading: false,
            });
            throw error;
          }
        },

        resetPassword: async (token: string, newPassword: string) => {
          try {
            set({ isLoading: true, error: null });
            const response = await authApi.resetPassword(token, newPassword);
            
            if (response.success) {
              set({
                isLoading: false,
                lastUpdated: new Date(),
              });
            } else {
              throw new Error(response.message || 'Failed to reset password');
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to reset password',
              isLoading: false,
            });
            throw error;
          }
        },

        // State management
        setUser: (user: User | null) => {
          set({ user, isAuthenticated: !!user });
        },

        setTokens: (token: string | null, refreshToken: string | null) => {
          if (token) {
            localStorage.setItem('authToken', token);
          } else {
            localStorage.removeItem('authToken');
          }
          set({ token, refreshToken });
        },

        setLoading: (isLoading: boolean) => {
          set({ isLoading });
        },

        setError: (error: string | null) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },

        reset: () => {
          localStorage.removeItem('authToken');
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            lastUpdated: null,
          });
        },
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);