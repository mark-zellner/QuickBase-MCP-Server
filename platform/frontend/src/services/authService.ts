import { User, LoginInput, RegisterInput, ApiResponse } from '../types';
import { apiClient } from './apiClient';

interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  private baseURL = '/api/auth';

  async login(email: string, password: string): Promise<AuthResponse> {
    const loginData: LoginInput = { email, password };
    const response = await apiClient.post<ApiResponse<AuthResponse>>(`${this.baseURL}/login`, loginData);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Login failed');
    }
    
    return response.data.data;
  }

  async register(userData: RegisterInput): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(`${this.baseURL}/register`, userData);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Registration failed');
    }
    
    return response.data.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(`${this.baseURL}/me`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to get user info');
    }
    
    return response.data.data;
  }

  async refreshToken(): Promise<string> {
    const response = await apiClient.post<ApiResponse<{ token: string }>>(`${this.baseURL}/refresh`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Token refresh failed');
    }
    
    return response.data.data.token;
  }
}

export const authService = new AuthService();