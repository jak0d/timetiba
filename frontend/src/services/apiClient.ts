import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, ErrorResponse, PaginatedResponse, RequestOptions, ApiClientConfig } from '../types/api';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(this.transformError(error));
      }
    );
  }

  private transformError(error: any): ErrorResponse {
    if (error.response?.data) {
      return error.response.data;
    }
    
    return {
      success: false,
      code: error.code || 'NETWORK_ERROR',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date(),
    };
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    try {
      const config: AxiosRequestConfig = {
        method,
        url,
        data,
        headers: options?.headers,
        timeout: options?.timeout,
        signal: options?.signal,
      };

      const response: AxiosResponse<ApiResponse<T>> = await this.client.request(config);
      return response.data;
    } catch (error) {
      throw this.transformError(error);
    }
  }

  // Generic CRUD methods
  async get<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, options);
  }

  async post<T>(url: string, data: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, options);
  }

  async put<T>(url: string, data: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, options);
  }

  async delete<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  // Paginated requests
  async getPaginated<T>(
    url: string,
    params?: Record<string, any>,
    options?: RequestOptions
  ): Promise<PaginatedResponse<T>> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<T[]>('GET', `${url}${queryString}`, undefined, options) as Promise<PaginatedResponse<T>>;
  }

  // File upload
  async uploadFile<T>(
    url: string,
    file: File,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<T>('POST', url, formData, {
      ...options,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...options?.headers,
      },
    });
  }

  // Update base URL (useful for environment switching)
  updateBaseURL(baseURL: string) {
    this.baseURL = baseURL;
    this.client.defaults.baseURL = baseURL;
  }

  // Get current base URL
  getBaseURL(): string {
    return this.baseURL;
  }
}

// Create and export default instance
const apiClient = new ApiClient({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
});

export default apiClient;
export { ApiClient };