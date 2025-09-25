import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/userRepository';
import { 
  User, 
  CreateUserRequest, 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenRequest, 
  RefreshTokenResponse,
  AuthenticatedUser 
} from '../models/user';
import { JWTPayload, AuthConfig, SecurityConfig } from '../types/auth';

export class AuthService {
  private userRepository: UserRepository;
  private authConfig: AuthConfig;
  private securityConfig: SecurityConfig;

  constructor(
    userRepository: UserRepository,
    authConfig: AuthConfig,
    securityConfig: SecurityConfig
  ) {
    this.userRepository = userRepository;
    this.authConfig = authConfig;
    this.securityConfig = securityConfig;
  }

  async register(userData: CreateUserRequest): Promise<AuthenticatedUser> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate password strength
    this.validatePassword(userData.password);

    // Hash password
    const hashedPassword = await this.hashPassword(userData.password);

    // Create user
    const user = await this.userRepository.create({
      ...userData,
      password: hashedPassword
    });

    // Return user without sensitive data
    return this.sanitizeUser(user);
  }

  async login(loginData: LoginRequest): Promise<LoginResponse> {
    // Find user by email
    const user = await this.userRepository.findByEmail(loginData.email);
    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(loginData.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store refresh token
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setTime(
      refreshTokenExpiresAt.getTime() + 
      this.parseExpirationTime(this.authConfig.refreshTokenExpiresIn)
    );

    await this.userRepository.updateRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);
    await this.userRepository.updateLastLogin(user.id);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken
    };
  }

  async refreshToken(refreshData: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshData.refreshToken, this.authConfig.refreshTokenSecret) as JWTPayload;
      
      // Find user by refresh token
      const user = await this.userRepository.findByRefreshToken(refreshData.refreshToken);
      if (!user || !user.isActive || user.id !== payload.userId) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // Update refresh token in database
      const refreshTokenExpiresAt = new Date();
      refreshTokenExpiresAt.setTime(
        refreshTokenExpiresAt.getTime() + 
        this.parseExpirationTime(this.authConfig.refreshTokenExpiresIn)
      );

      await this.userRepository.updateRefreshToken(user.id, newRefreshToken, refreshTokenExpiresAt);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userRepository.clearRefreshToken(userId);
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.authConfig.jwtSecret) as JWTPayload;
      
      // Verify user still exists and is active
      const user = await this.userRepository.findById(payload.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return payload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  private generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    };

    return jwt.sign(payload, this.authConfig.jwtSecret, {
      expiresIn: this.authConfig.jwtExpiresIn
    } as any);
  }

  private generateRefreshToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    };

    return jwt.sign(payload, this.authConfig.refreshTokenSecret, {
      expiresIn: this.authConfig.refreshTokenExpiresIn
    } as any);
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.authConfig.bcryptRounds);
  }

  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  private validatePassword(password: string): void {
    if (password.length < this.securityConfig.passwordMinLength) {
      throw new Error(`Password must be at least ${this.securityConfig.passwordMinLength} characters long`);
    }

    if (this.securityConfig.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (this.securityConfig.passwordRequireNumber && !/\d/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (this.securityConfig.passwordRequireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }

  private sanitizeUser(user: User): AuthenticatedUser {
    const { password, refreshToken, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  private parseExpirationTime(expiration: string): number {
    // Parse expiration strings like '7d', '24h', '60m'
    const match = expiration.match(/^(\d+)([dhm])$/);
    if (!match || !match[1] || !match[2]) {
      throw new Error('Invalid expiration format');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000; // days to milliseconds
      case 'h':
        return value * 60 * 60 * 1000; // hours to milliseconds
      case 'm':
        return value * 60 * 1000; // minutes to milliseconds
      default:
        throw new Error('Invalid expiration unit');
    }
  }
}