import { Pool } from 'pg';
import { UserRepository } from '../repositories/userRepository';
import { User, UserRole, CreateUserRequest } from '../models/user';

// Mock pg Pool
const mockPool = {
  query: jest.fn()
} as unknown as jest.Mocked<Pool>;

describe('UserRepository', () => {
  let userRepository: UserRepository;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.LECTURER,
    isActive: true,
    tenantId: 'tenant-1',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  const mockDbRow = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashedPassword',
    first_name: 'John',
    last_name: 'Doe',
    role: 'lecturer',
    is_active: true,
    last_login: null,
    refresh_token: null,
    refresh_token_expires_at: null,
    tenant_id: 'tenant-1',
    created_at: new Date('2023-01-01'),
    updated_at: new Date('2023-01-01'),
    deleted_at: null
  };

  beforeEach(() => {
    userRepository = new UserRepository(mockPool);
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockDbRow] });

      const result = await userRepository.findByEmail('test@example.com');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
        ['test@example.com']
      );
      expect(result).toEqual(expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName
      }));
    });

    it('should return null if user not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await userRepository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByRefreshToken', () => {
    it('should find user by valid refresh token', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockDbRow] });

      const result = await userRepository.findByRefreshToken('valid-refresh-token');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE refresh_token = $1'),
        ['valid-refresh-token']
      );
      expect(result).toEqual(expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email
      }));
    });

    it('should return null for invalid refresh token', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await userRepository.findByRefreshToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create new user', async () => {
      const createUserData: CreateUserRequest = {
        email: 'newuser@example.com',
        password: 'hashedPassword',
        firstName: 'Jane',
        lastName: 'Smith',
        role: UserRole.STUDENT,
        tenantId: 'tenant-1'
      };

      const newUserRow = {
        ...mockDbRow,
        id: 'user-2',
        email: 'newuser@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'student'
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [newUserRow] });

      const result = await userRepository.create(createUserData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          expect.any(String), // id
          createUserData.email,
          createUserData.password,
          createUserData.firstName,
          createUserData.lastName,
          createUserData.role,
          true, // isActive
          createUserData.tenantId
        ])
      );
      expect(result).toEqual(expect.objectContaining({
        email: createUserData.email,
        firstName: createUserData.firstName,
        lastName: createUserData.lastName,
        role: createUserData.role
      }));
    });
  });

  describe('updateRefreshToken', () => {
    it('should update refresh token', async () => {
      const refreshToken = 'new-refresh-token';
      const expiresAt = new Date();
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await userRepository.updateRefreshToken('user-1', refreshToken, expiresAt);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET refresh_token = $1'),
        [refreshToken, expiresAt, 'user-1']
      );
    });
  });

  describe('clearRefreshToken', () => {
    it('should clear refresh token', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await userRepository.clearRefreshToken('user-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SET refresh_token = NULL'),
        ['user-1']
      );
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await userRepository.updateLastLogin('user-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SET last_login = NOW()'),
        ['user-1']
      );
    });
  });

  describe('findByTenant', () => {
    it('should find users by tenant', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockDbRow] });

      const result = await userRepository.findByTenant('tenant-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tenant_id = $1'),
        ['tenant-1']
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        tenantId: 'tenant-1'
      }));
    });
  });
});