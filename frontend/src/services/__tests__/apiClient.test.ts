import axios from 'axios';
import { ApiClient } from '../apiClient';
import { ApiResponse, ErrorResponse } from '../../types/api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      request: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      defaults: { baseURL: '' },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    apiClient = new ApiClient({
      baseURL: 'http://localhost:3001/api',
      timeout: 5000,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3001/api',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should setup interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockResponse: ApiResponse<{ id: string }> = {
        success: true,
        data: { id: '1' },
        timestamp: new Date(),
      };

      mockAxiosInstance.request.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.get<{ id: string }>('/test');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/test',
        data: undefined,
        headers: undefined,
        timeout: undefined,
        signal: undefined,
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle GET request errors', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            code: 'NOT_FOUND',
            message: 'Resource not found',
            timestamp: new Date(),
          } as ErrorResponse,
        },
      };

      mockAxiosInstance.request.mockRejectedValue(mockError);

      await expect(apiClient.get('/test')).rejects.toEqual(mockError.response.data);
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request', async () => {
      const mockData = { name: 'Test' };
      const mockResponse: ApiResponse<{ id: string; name: string }> = {
        success: true,
        data: { id: '1', name: 'Test' },
        timestamp: new Date(),
      };

      mockAxiosInstance.request.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.post<{ id: string; name: string }>('/test', mockData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/test',
        data: mockData,
        headers: undefined,
        timeout: undefined,
        signal: undefined,
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('PUT requests', () => {
    it('should make successful PUT request', async () => {
      const mockData = { name: 'Updated Test' };
      const mockResponse: ApiResponse<{ id: string; name: string }> = {
        success: true,
        data: { id: '1', name: 'Updated Test' },
        timestamp: new Date(),
      };

      mockAxiosInstance.request.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.put<{ id: string; name: string }>('/test/1', mockData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/test/1',
        data: mockData,
        headers: undefined,
        timeout: undefined,
        signal: undefined,
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('DELETE requests', () => {
    it('should make successful DELETE request', async () => {
      const mockResponse: ApiResponse<void> = {
        success: true,
        timestamp: new Date(),
      };

      mockAxiosInstance.request.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.delete<void>('/test/1');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/test/1',
        data: undefined,
        headers: undefined,
        timeout: undefined,
        signal: undefined,
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('authentication', () => {
    it('should add auth token to requests when available', () => {
      localStorage.setItem('authToken', 'test-token');

      // Get the request interceptor function
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config = { headers: {} };

      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('should not add auth token when not available', () => {
      // Get the request interceptor function
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config = { headers: {} };

      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should transform network errors', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';

      mockAxiosInstance.request.mockRejectedValue(networkError);

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        success: false,
        code: undefined,
        message: 'Network Error',
      });
    });

    it('should handle 401 unauthorized errors', () => {
      const unauthorizedError = {
        response: { status: 401 },
      };

      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: '' };

      // Get the response interceptor error handler
      const responseErrorHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];

      responseErrorHandler(unauthorizedError);

      expect(localStorage.getItem('authToken')).toBeNull();
      expect(window.location.href).toBe('/login');
    });
  });

  describe('file upload', () => {
    it('should upload file with correct headers', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockResponse: ApiResponse<{ url: string }> = {
        success: true,
        data: { url: 'http://example.com/file.txt' },
        timestamp: new Date(),
      };

      mockAxiosInstance.request.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.uploadFile<{ url: string }>('/upload', mockFile);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/upload',
        data: expect.any(FormData),
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: undefined,
        signal: undefined,
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('utility methods', () => {
    it('should update base URL', () => {
      const newBaseURL = 'http://localhost:3002/api';
      apiClient.updateBaseURL(newBaseURL);

      expect(apiClient.getBaseURL()).toBe(newBaseURL);
      expect(mockAxiosInstance.defaults.baseURL).toBe(newBaseURL);
    });

    it('should get current base URL', () => {
      expect(apiClient.getBaseURL()).toBe('http://localhost:3001/api');
    });
  });
});