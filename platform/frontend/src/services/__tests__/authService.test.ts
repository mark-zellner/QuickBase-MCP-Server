import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../authService';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
      get: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: { id: '1', email: 'test@example.com', name: 'Test User' },
            token: 'mock-jwt-token',
          },
        },
      };

      const mockAxios = await import('axios');
      const mockPost = vi.fn().mockResolvedValue(mockResponse);
      (mockAxios.default.create as any).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBe('mock-jwt-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'mock-jwt-token');
    });

    it('should throw error for invalid credentials', async () => {
      const mockAxios = await import('axios');
      const mockPost = vi.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { success: false, error: { message: 'Invalid credentials' } },
        },
      });
      (mockAxios.default.create as any).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      });

      await expect(authService.login({
        email: 'test@example.com',
        password: 'wrongpassword',
      })).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: { id: '1', email: 'newuser@example.com', name: 'New User' },
            token: 'mock-jwt-token',
          },
        },
      };

      const mockAxios = await import('axios');
      const mockPost = vi.fn().mockResolvedValue(mockResponse);
      (mockAxios.default.create as any).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      });

      const result = await authService.register({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(result.user.email).toBe('newuser@example.com');
      expect(result.token).toBe('mock-jwt-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'mock-jwt-token');
    });

    it('should throw error for duplicate email', async () => {
      const mockAxios = await import('axios');
      const mockPost = vi.fn().mockRejectedValue({
        response: {
          status: 400,
          data: { success: false, error: { message: 'Email already exists' } },
        },
      });
      (mockAxios.default.create as any).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      });

      await expect(authService.register({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      })).rejects.toThrow('Email already exists');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when token is valid', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');

      const mockResponse = {
        data: {
          success: true,
          data: { id: '1', email: 'test@example.com', name: 'Test User' },
        },
      };

      const mockAxios = await import('axios');
      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      (mockAxios.default.create as any).mockReturnValue({
        post: vi.fn(),
        get: mockGet,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      });

      const user = await authService.getCurrentUser();

      expect(user.email).toBe('test@example.com');
      expect(mockGet).toHaveBeenCalledWith('/auth/me');
    });

    it('should throw error when no token is stored', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      await expect(authService.getCurrentUser()).rejects.toThrow('No authentication token found');
    });

    it('should throw error when token is invalid', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-token');

      const mockAxios = await import('axios');
      const mockGet = vi.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { success: false, error: { message: 'Invalid token' } },
        },
      });
      (mockAxios.default.create as any).mockReturnValue({
        post: vi.fn(),
        get: mockGet,
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      });

      await expect(authService.getCurrentUser()).rejects.toThrow('Invalid token');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockLocalStorage.getItem.mockReturnValue('old-token');

      const mockResponse = {
        data: {
          success: true,
          data: { token: 'new-token' },
        },
      };

      const mockAxios = await import('axios');
      const mockPost = vi.fn().mockResolvedValue(mockResponse);
      (mockAxios.default.create as any).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      });

      const newToken = await authService.refreshToken();

      expect(newToken).toBe('new-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-token');
    });

    it('should throw error when refresh fails', async () => {
      mockLocalStorage.getItem.mockReturnValue('expired-token');

      const mockAxios = await import('axios');
      const mockPost = vi.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { success: false, error: { message: 'Token expired' } },
        },
      });
      (mockAxios.default.create as any).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      });

      await expect(authService.refreshToken()).rejects.toThrow('Token expired');
    });
  });

  describe('logout', () => {
    it('should clear stored token', () => {
      authService.logout();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('getToken', () => {
    it('should return stored token', () => {
      mockLocalStorage.getItem.mockReturnValue('stored-token');

      const token = authService.getToken();

      expect(token).toBe('stored-token');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_token');
    });

    it('should return null when no token is stored', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const token = authService.getToken();

      expect(token).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(true);
    });

    it('should return false when no token exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(false);
    });
  });
});