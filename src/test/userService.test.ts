import { UserService } from '../services/userService';
import { UserRepository } from '../repositories/userRepository';
import { AuthService } from '../services/authService';
import { User, UserRole, CreateUserRequest } from '../models/user';

// Mock dependencies
jest.mock('../repositories/userRepository');
jest.mock('../services/authService');

const mockUserRepository = new UserRepository({} as any) as jest.Mocked<UserRepository>;
const mockAuthService = new AuthService({} as any, {} as any, {} as any) as jest.Mocked<AuthService>;

describe('UserService', () => {
  let userService: UserService;

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

  const mockSanitizedUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.LECTURER,
    isActive: true,
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    userService = new UserService(mockUserRepository, mockAuthService);
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const createUserData: CreateUserRequest = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        role: UserRole.STUDENT,
        tenantId: 'tenant-1'
      };

      mockAuthService.register.mockResolvedValue(mockSanitizedUser);

      const result = await userService.createUser(createUserData);

      expect(mockAuthService.register).toHaveBeenCalledWith(createUserData);
      expect(result).toEqual(mockSanitizedUser);
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById('user-1');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockSanitizedUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await userService.getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await userService.getUserByEmail('test@example.com');

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual(mockSanitizedUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await userService.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateData = { firstName: 'Updated', lastName: 'Name' };
      const updatedUser = { ...mockUser, ...updateData };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser('user-1', updateData);

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1');
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', updateData);
      expect(result).toEqual(expect.objectContaining({
        firstName: 'Updated',
        lastName: 'Name'
      }));
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.updateUser('nonexistent', {})).rejects.toThrow('User not found');
    });

    it('should throw error if email already exists', async () => {
      const updateData = { email: 'existing@example.com' };
      const existingUser = { ...mockUser, email: 'existing@example.com' };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(userService.updateUser('user-1', updateData)).rejects.toThrow('Email already in use');
    });

    it('should allow updating to same email', async () => {
      const updateData = { email: 'test@example.com' }; // Same email
      const updatedUser = { ...mockUser, ...updateData };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser('user-1', updateData);

      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockUserRepository.delete.mockResolvedValue(true);

      const result = await userService.deleteUser('user-1');

      expect(mockUserRepository.delete).toHaveBeenCalledWith('user-1');
      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      mockUserRepository.delete.mockResolvedValue(false);

      const result = await userService.deleteUser('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };
      mockUserRepository.update.mockResolvedValue(deactivatedUser);

      const result = await userService.deactivateUser('user-1');

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { isActive: false });
      expect(result).toBe(true);
    });
  });

  describe('activateUser', () => {
    it('should activate user successfully', async () => {
      const activatedUser = { ...mockUser, isActive: true };
      mockUserRepository.update.mockResolvedValue(activatedUser);

      const result = await userService.activateUser('user-1');

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { isActive: true });
      expect(result).toBe(true);
    });
  });

  describe('getUsersByTenant', () => {
    it('should return paginated users for tenant', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-2' }];
      mockUserRepository.findByTenant.mockResolvedValue(users);

      const result = await userService.getUsersByTenant('tenant-1', {}, 1, 10);

      expect(mockUserRepository.findByTenant).toHaveBeenCalledWith('tenant-1');
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter users by role', async () => {
      const users = [
        mockUser,
        { ...mockUser, id: 'user-2', role: UserRole.STUDENT }
      ];
      mockUserRepository.findByTenant.mockResolvedValue(users);

      const result = await userService.getUsersByTenant('tenant-1', { role: UserRole.LECTURER });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].role).toBe(UserRole.LECTURER);
    });

    it('should filter users by search term', async () => {
      const users = [
        mockUser,
        { ...mockUser, id: 'user-2', firstName: 'Jane', email: 'jane@example.com' }
      ];
      mockUserRepository.findByTenant.mockResolvedValue(users);

      const result = await userService.getUsersByTenant('tenant-1', { search: 'jane' });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].firstName).toBe('Jane');
    });

    it('should apply pagination correctly', async () => {
      const users = Array.from({ length: 25 }, (_, i) => ({
        ...mockUser,
        id: `user-${i + 1}`
      }));
      mockUserRepository.findByTenant.mockResolvedValue(users);

      const result = await userService.getUsersByTenant('tenant-1', {}, 2, 10);

      expect(result.users).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
    });
  });

  describe('getUsersByRole', () => {
    it('should return users by role', async () => {
      const users = [
        mockUser,
        { ...mockUser, id: 'user-2', role: UserRole.STUDENT }
      ];
      mockUserRepository.findByTenant.mockResolvedValue(users);

      const result = await userService.getUsersByRole(UserRole.LECTURER, 'tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe(UserRole.LECTURER);
    });

    it('should filter out inactive users', async () => {
      const users = [
        mockUser,
        { ...mockUser, id: 'user-2', isActive: false }
      ];
      mockUserRepository.findByTenant.mockResolvedValue(users);

      const result = await userService.getUsersByRole(UserRole.LECTURER, 'tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });
  });

  describe('changeUserRole', () => {
    it('should change user role successfully', async () => {
      const updatedUser = { ...mockUser, role: UserRole.ADMIN };
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.changeUserRole('user-1', UserRole.ADMIN);

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { role: UserRole.ADMIN });
      expect(result?.role).toBe(UserRole.ADMIN);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const users = [
        mockUser,
        { ...mockUser, id: 'user-2', role: UserRole.STUDENT },
        { ...mockUser, id: 'user-3', role: UserRole.ADMIN, isActive: false }
      ];
      mockUserRepository.findByTenant.mockResolvedValue(users);

      const result = await userService.getUserStats('tenant-1');

      expect(result.total).toBe(3);
      expect(result.active).toBe(2);
      expect(result.inactive).toBe(1);
      expect(result.byRole[UserRole.LECTURER]).toBe(1);
      expect(result.byRole[UserRole.STUDENT]).toBe(1);
      expect(result.byRole[UserRole.ADMIN]).toBe(1);
    });

    it('should return stats for all tenants when no tenant specified', async () => {
      const users = [mockUser];
      mockUserRepository.findAll.mockResolvedValue(users);

      const result = await userService.getUserStats();

      expect(mockUserRepository.findAll).toHaveBeenCalled();
      expect(result.total).toBe(1);
    });
  });
});