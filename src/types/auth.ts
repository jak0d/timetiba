import { UserRole } from '../models/user';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string;
  iat?: number;
  exp?: number;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenSecret: string;
  refreshTokenExpiresIn: string;
  bcryptRounds: number;
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface RolePermissions {
  [UserRole.ADMIN]: Permission[];
  [UserRole.LECTURER]: Permission[];
  [UserRole.STUDENT]: Permission[];
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
  passwordMinLength: number;
  passwordRequireSpecialChar: boolean;
  passwordRequireNumber: boolean;
  passwordRequireUppercase: boolean;
}