import { AuthConfig, SecurityConfig } from '../types/auth';

export function createAuthConfig(): AuthConfig {
  return {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'your-super-secret-refresh-key',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12')
  };
}

export function createSecurityConfig(): SecurityConfig {
  return {
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '15'), // minutes
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
    passwordRequireSpecialChar: process.env.PASSWORD_REQUIRE_SPECIAL_CHAR !== 'false',
    passwordRequireNumber: process.env.PASSWORD_REQUIRE_NUMBER !== 'false',
    passwordRequireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false'
  };
}

export function validateAuthConfig(config: AuthConfig): void {
  if (!config.jwtSecret || config.jwtSecret === 'your-super-secret-jwt-key') {
    throw new Error('JWT_SECRET environment variable must be set to a secure value');
  }

  if (!config.refreshTokenSecret || config.refreshTokenSecret === 'your-super-secret-refresh-key') {
    throw new Error('REFRESH_TOKEN_SECRET environment variable must be set to a secure value');
  }

  if (config.bcryptRounds < 10) {
    throw new Error('BCRYPT_ROUNDS should be at least 10 for security');
  }
}

export function validateSecurityConfig(config: SecurityConfig): void {
  if (config.passwordMinLength < 8) {
    throw new Error('PASSWORD_MIN_LENGTH should be at least 8 characters');
  }

  if (config.maxLoginAttempts < 3) {
    throw new Error('MAX_LOGIN_ATTEMPTS should be at least 3');
  }

  if (config.lockoutDuration < 5) {
    throw new Error('LOCKOUT_DURATION should be at least 5 minutes');
  }
}