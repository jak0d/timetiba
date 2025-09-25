import { AuthService } from '../services/authService';
import { UserRepository } from '../repositories/userRepository';
import { User, UserRole, CreateUserRequest, LoginRequest } from '../models/user';
import { AuthConfig, SecurityConfig } from '../types/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../repositories/userRepository');

const mockUserRepository = new UserRepository({} as any) as jest.Mocked<UserRepository>;
// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn()
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let authService: AuthService;
  let authConfig: AuthConfig;
  let securityConfig: SecurityConfig;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.LECTURER,
    isActive: true,
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    authConfig = {
      jwtSecret: 'test-jwt-secret',
      jwtExpiresIn: '15m',
      refreshTokenSecret: 'test-refresh-secret',
      refreshTokenExpiresIn: '7d',
      bcryptRounds: 10
    };

    securityConfig = {
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      passwordMinLength: 8,
      passwordRequireSpecialChar: true,
      passwordRequireNumber: true,
      passwordRequireUppercase: true
    };

    authService = new AuthService(mockUserRepository, authConfig, securityConfig);
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerData: CreateUserRequest = {
      email: 'newuser@example.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.LECTURER,
      tenantId: 'tenant-1'
    };

    it('should register a new user successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashedPassword');
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await authService.register(registerData);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(registerData.email);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(registerData.password, authConfig.bcryptRounds);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...registerData,
        password: 'hashedPassword'
      });
      expect(result).toEqual(expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role
      }));
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should throw error if user already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.register(registerData)).rejects.toThrow('User with this email already exists');
    });

    it('should validate password strength', async () => {
      const weakPasswordData = { ...registerData, password: 'weak' };
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.register(weakPasswordData)).rejects.toThrow('Password must be at least 8 characters long');
    });

    it('should require uppercase letter', async () => {
      const noUppercaseData = { ...registerData, password: 'password123!' };
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.register(noUppercaseData)).rejects.toThrow('Password must contain at least one uppercase letter');
    });

    it('should require number', async () => {
      const noNumberData = { ...registerData, password: 'Password!' };
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.register(noNumberData)).rejects.toThrow('Password must contain at least one number');
    });

    it('should require special character', async () => {
      const noSpecialCharData = { ...registerData, password: 'Password123' };
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.register(noSpecialCharData)).rejects.toThrow('Password must contain at least one special character');
    });
  });

  describe('login', () => {
    const loginData: LoginRequest = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should login successfully with valid credentials', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockUserRepository.updateRefreshToken.mockResolvedValue();
      mockUserRepository.updateLastLogin.mockResolvedValue();

      const result = await authService.login(loginData);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
      expect(mockUserRepository.updateRefreshToken).toHaveBeenCalled();
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email
        }),
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      });
    });

    it('should throw error for non-existent user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findByEmail.mockResolvedValue(inactiveUser);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for invalid password', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    const refreshTokenData = { refreshToken: 'valid-refresh-token' };
    const mockPayload = {
      userId: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      tenantId: mockUser.tenantId
    };

    it('should refresh token successfully', async () => {
      mockJwt.verify.mockReturnValue(mockPayload as any);
      mockUserRepository.findByRefreshToken.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValueOnce('new-access-token').mockReturnValueOnce('new-refresh-token');
      mockUserRepository.updateRefreshToken.mockResolvedValue();

      const result = await authService.refreshToken(refreshTokenData);

      expect(mockJwt.verify).toHaveBeenCalledWith(refreshTokenData.refreshToken, authConfig.refreshTokenSecret);
      expect(mockUserRepository.findByRefreshToken).toHaveBeenCalledWith(refreshTokenData.refreshToken);
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      });
    });

    it('should throw error for invalid refresh token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken(refreshTokenData)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error if user not found', async () => {
      mockJwt.verify.mockReturnValue(mockPayload as any);
      mockUserRepository.findByRefreshToken.mockResolvedValue(null);

      await expect(authService.refreshToken(refreshTokenData)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('verifyAccessToken', () => {
    const accessToken = 'valid-access-token';
    const mockPayload = {
      userId: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      tenantId: mockUser.tenantId
    };

    it('should verify token successfully', async () => {
      mockJwt.verify.mockReturnValue(mockPayload as any);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.verifyAccessToken(accessToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(accessToken, authConfig.jwtSecret);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockPayload.userId);
      expect(result).toEqual(mockPayload);
    });

    it('should throw error for invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.verifyAccessToken(accessToken)).rejects.toThrow('Invalid access token');
    });

    it('should throw error if user not found', async () => {
      mockJwt.verify.mockReturnValue(mockPayload as any);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.verifyAccessToken(accessToken)).rejects.toThrow('Invalid access token');
    });

    it('should throw error if user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockJwt.verify.mockReturnValue(mockPayload as any);
      mockUserRepository.findById.mockResolvedValue(inactiveUser);

      await expect(authService.verifyAccessToken(accessToken)).rejects.toThrow('Invalid access token');
    });
  });

  describe('logout', () => {
    it('should clear refresh token', async () => {
      mockUserRepository.clearRefreshToken.mockResolvedValue();

      await authService.logout(mockUser.id);

      expect(mockUserRepository.clearRefreshToken).toHaveBeenCalledWith(mockUser.id);
    });
  });
});