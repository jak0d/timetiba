import { UserRepository } from '../repositories/userRepository';
import { User, CreateUserRequest, AuthenticatedUser, UserRole } from '../models/user';
import { AuthService } from './authService';

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserListResponse {
  users: AuthenticatedUser[];
  total: number;
  page: number;
  limit: number;
}

export interface UserSearchFilters {
  role?: UserRole;
  isActive?: boolean;
  tenantId?: string;
  search?: string; // Search in name or email
}

export class UserService {
  private userRepository: UserRepository;
  private authService: AuthService;

  constructor(userRepository: UserRepository, authService: AuthService) {
    this.userRepository = userRepository;
    this.authService = authService;
  }

  async createUser(userData: CreateUserRequest): Promise<AuthenticatedUser> {
    return this.authService.register(userData);
  }

  async getUserById(id: string): Promise<AuthenticatedUser | null> {
    const user = await this.userRepository.findById(id);
    return user ? this.sanitizeUser(user) : null;
  }

  async getUserByEmail(email: string): Promise<AuthenticatedUser | null> {
    const user = await this.userRepository.findByEmail(email);
    return user ? this.sanitizeUser(user) : null;
  }

  async updateUser(id: string, updateData: UpdateUserRequest): Promise<AuthenticatedUser | null> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await this.userRepository.findByEmail(updateData.email);
      if (emailExists) {
        throw new Error('Email already in use');
      }
    }

    const updatedUser = await this.userRepository.update(id, updateData);
    return updatedUser ? this.sanitizeUser(updatedUser) : null;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.userRepository.delete(id);
  }

  async deactivateUser(id: string): Promise<boolean> {
    const updated = await this.userRepository.update(id, { isActive: false });
    return !!updated;
  }

  async activateUser(id: string): Promise<boolean> {
    const updated = await this.userRepository.update(id, { isActive: true });
    return !!updated;
  }

  async getUsersByTenant(tenantId: string, filters?: UserSearchFilters, page = 1, limit = 50): Promise<UserListResponse> {
    const users = await this.userRepository.findByTenant(tenantId);
    
    // Apply filters
    let filteredUsers = users;
    
    if (filters) {
      if (filters.role) {
        filteredUsers = filteredUsers.filter(user => user.role === filters.role);
      }
      
      if (filters.isActive !== undefined) {
        filteredUsers = filteredUsers.filter(user => user.isActive === filters.isActive);
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
          user.firstName.toLowerCase().includes(searchLower) ||
          user.lastName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
        );
      }
    }

    // Apply pagination
    const total = filteredUsers.length;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);

    return {
      users: paginatedUsers.map(user => this.sanitizeUser(user)),
      total,
      page,
      limit
    };
  }

  async getUsersByRole(role: UserRole, tenantId?: string): Promise<AuthenticatedUser[]> {
    const users = tenantId 
      ? await this.userRepository.findByTenant(tenantId)
      : await this.userRepository.findAll();
    
    const filteredUsers = users.filter(user => user.role === role && user.isActive);
    return filteredUsers.map(user => this.sanitizeUser(user));
  }

  async changeUserRole(id: string, newRole: UserRole): Promise<AuthenticatedUser | null> {
    const updatedUser = await this.userRepository.update(id, { role: newRole });
    return updatedUser ? this.sanitizeUser(updatedUser) : null;
  }

  async getUserStats(tenantId?: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
  }> {
    const users = tenantId 
      ? await this.userRepository.findByTenant(tenantId)
      : await this.userRepository.findAll();

    const stats = {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      byRole: {
        [UserRole.ADMIN]: users.filter(u => u.role === UserRole.ADMIN).length,
        [UserRole.LECTURER]: users.filter(u => u.role === UserRole.LECTURER).length,
        [UserRole.STUDENT]: users.filter(u => u.role === UserRole.STUDENT).length
      }
    };

    return stats;
  }

  private sanitizeUser(user: User): AuthenticatedUser {
    const { password, refreshToken, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}