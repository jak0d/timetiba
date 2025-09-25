import apiClient from './apiClient';
import { ApiResponse } from '../types/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'lecturer' | 'student';
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export class AuthApi {
  private readonly basePath = '/auth';

  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>(`${this.basePath}/login`, credentials);
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>(`${this.basePath}/register`, userData);
  }

  async logout(): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/logout`, {});
  }

  async refreshToken(request: RefreshTokenRequest): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>(`${this.basePath}/refresh`, request);
  }

  async getCurrentUser(): Promise<ApiResponse<AuthResponse['user']>> {
    return apiClient.get<AuthResponse['user']>(`${this.basePath}/me`);
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return apiClient.put<void>(`${this.basePath}/change-password`, {
      oldPassword,
      newPassword,
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/forgot-password`, { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/reset-password`, {
      token,
      newPassword,
    });
  }
}

export const authApi = new AuthApi();