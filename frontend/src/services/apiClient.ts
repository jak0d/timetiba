import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
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
        
        // Handle FormData - remove Content-Type to let browser set it with boundary
        if (config.data instanceof FormData) {
          console.log('ApiClient: Request interceptor - Detected FormData, removing Content-Type header');
          delete config.headers['Content-Type'];
        }
        
        // Debug request details
        console.log('ApiClient: Request interceptor - URL:', config.url);
        console.log('ApiClient: Request interceptor - Method:', config.method);
        console.log('ApiClient: Request interceptor - Headers:', config.headers);
        console.log('ApiClient: Request interceptor - Data type:', config.data?.constructor?.name);
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log('ApiClient: Response interceptor - success:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.log('ApiClient: Response interceptor - error:', error.response?.status, error.config?.url);
        
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
    console.log('ApiClient: Transforming error:', error);
    
    if (error.response?.data) {
      console.log('ApiClient: Error has response data:', error.response.data);
      return error.response.data;
    }
    
    const transformedError: ErrorResponse = {
      success: false,
      code: error.code || 'NETWORK_ERROR',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date(),
    };
    
    console.log('ApiClient: Transformed error:', transformedError);
    return transformedError;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    try {
      const config: any = {
        method,
        url,
        data,
        headers: options?.headers,
        timeout: options?.timeout,
        signal: options?.signal,
      };

      // For FormData, don't set Content-Type header
      if (data instanceof FormData) {
        delete config.headers?.['Content-Type'];
      }

      console.log('ApiClient: Making request:', {
        method,
        url: this.baseURL + url,
        hasData: !!data,
        dataType: data?.constructor?.name,
        headers: config.headers
      });

      const response: any = await this.client.request(config);
      console.log('ApiClient: Response received:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('ApiClient: Request failed:', {
        method,
        url: this.baseURL + url,
        error,
        response: (error as any)?.response?.data,
        status: (error as any)?.response?.status
      });
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
    const fullUrl = this.baseURL + url;
    console.log('ApiClient: Uploading file to:', fullUrl);
    console.log('ApiClient: File details:', { name: file.name, size: file.size, type: file.type });
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Debug FormData contents
    console.log('ApiClient: FormData created');
    for (let [key, value] of formData.entries()) {
      console.log('ApiClient: FormData entry:', key, value);
    }

    try {
      // Use axios directly for file upload with minimal config
      const config: any = {
        timeout: options?.timeout || 30000,
        signal: options?.signal,
      };
      
      // Don't set any headers - let axios handle FormData automatically
      console.log('ApiClient: Request config:', config);
      console.log('ApiClient: Making POST request with FormData');
      
      const response = await this.client.post(url, formData, config);
      
      console.log('ApiClient: Upload successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('ApiClient: Upload failed:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        response: (error as any)?.response?.data,
        status: (error as any)?.response?.status,
        url: fullUrl
      });
      throw this.transformError(error);
    }
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
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
console.log('ApiClient: Using base URL:', baseURL);

const apiClient = new ApiClient({
  baseURL: baseURL + '/api',
  timeout: 30000,
});

export default apiClient;
export { ApiClient };
export { apiClient };