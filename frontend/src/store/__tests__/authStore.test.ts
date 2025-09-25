import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../authStore';
import { authApi } from '../../services/authApi';

// Mock the auth API
jest.mock('../../services/authApi');
const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useAuthStore', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
  };

  const mockAuthResponse = {
    token: 'mock-token',
    refreshToken: 'mock-refresh-token',
    user: mockUser,
  };

  beforeEach(() => {
    // Reset store state
    useAuthStore.getState().reset();
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.refreshToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResponse = {
        success: true,
        data: mockAuthResponse,
        timestamp: new Date(),
      };

      mockedAuthApi.login.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('mock-token');
      expect(result.current.refreshToken).toBe('mock-refresh-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'mock-token');
    });

    it('should handle login error', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const errorMessage = 'Invalid credentials';
      mockedAuthApi.login.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login(credentials);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should set loading state during login', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockedAuthApi.login.mockReturnValue(promise as any);

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login(credentials);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          success: true,
          data: mockAuthResponse,
          timestamp: new Date(),
        });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'admin' as const,
      };

      const mockResponse = {
        success: true,
        data: mockAuthResponse,
        timestamp: new Date(),
      };

      mockedAuthApi.register.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register(userData);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('mock-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'mock-token');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockResponse = {
        success: true,
        timestamp: new Date(),
      };

      mockedAuthApi.logout.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      // Set initial authenticated state
      act(() => {
        result.current.setUser(mockUser);
        result.current.setTokens('mock-token', 'mock-refresh-token');
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.refreshToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
    });

    it('should logout even if API call fails', async () => {
      mockedAuthApi.logout.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuthStore());

      // Set initial authenticated state
      act(() => {
        result.current.setUser(mockUser);
        result.current.setTokens('mock-token', 'mock-refresh-token');
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('refreshAuth', () => {
    it('should refresh token successfully', async () => {
      const newAuthResponse = {
        ...mockAuthResponse,
        token: 'new-token',
        refreshToken: 'new-refresh-token',
      };

      const mockResponse = {
        success: true,
        data: newAuthResponse,
        timestamp: new Date(),
      };

      mockedAuthApi.refreshToken.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      // Set initial state with refresh token
      act(() => {
        result.current.setTokens('old-token', 'mock-refresh-token');
      });

      await act(async () => {
        await result.current.refreshAuth();
      });

      expect(result.current.token).toBe('new-token');
      expect(result.current.refreshToken).toBe('new-refresh-token');
      expect(result.current.user).toEqual(mockUser);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'new-token');
    });

    it('should logout on refresh failure', async () => {
      mockedAuthApi.refreshToken.mockRejectedValue(new Error('Refresh failed'));

      const { result } = renderHook(() => useAuthStore());

      // Set initial state with refresh token
      act(() => {
        result.current.setUser(mockUser);
        result.current.setTokens('old-token', 'mock-refresh-token');
      });

      await act(async () => {
        try {
          await result.current.refreshAuth();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockUser,
        timestamp: new Date(),
      };

      mockedAuthApi.getCurrentUser.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.getCurrentUser();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockResponse = {
        success: true,
        timestamp: new Date(),
      };

      mockedAuthApi.changePassword.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.changePassword('oldPassword', 'newPassword');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle change password error', async () => {
      const errorMessage = 'Current password is incorrect';
      mockedAuthApi.changePassword.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.changePassword('wrongPassword', 'newPassword');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('state management', () => {
    it('should set and clear errors', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should set user and update authentication status', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.setUser(null);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should set tokens and update localStorage', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setTokens('test-token', 'test-refresh-token');
      });

      expect(result.current.token).toBe('test-token');
      expect(result.current.refreshToken).toBe('test-refresh-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'test-token');

      act(() => {
        result.current.setTokens(null, null);
      });

      expect(result.current.token).toBeNull();
      expect(result.current.refreshToken).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set some state
      act(() => {
        result.current.setUser(mockUser);
        result.current.setTokens('test-token', 'test-refresh-token');
        result.current.setError('Test error');
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.refreshToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
    });
  });
});