import { PermissionService } from '../services/permissionService';
import { UserRole } from '../models/user';

describe('PermissionService', () => {
  let permissionService: PermissionService;

  beforeEach(() => {
    permissionService = new PermissionService();
  });

  describe('hasPermission', () => {
    describe('Admin permissions', () => {
      it('should allow admin to access all resources', () => {
        expect(permissionService.hasPermission(UserRole.ADMIN, 'venues', 'create')).toBe(true);
        expect(permissionService.hasPermission(UserRole.ADMIN, 'users', 'delete')).toBe(true);
        expect(permissionService.hasPermission(UserRole.ADMIN, 'system', 'configure')).toBe(true);
      });

      it('should allow admin wildcard access', () => {
        expect(permissionService.hasPermission(UserRole.ADMIN, 'any-resource', 'any-action')).toBe(true);
      });
    });

    describe('Lecturer permissions', () => {
      it('should allow lecturer to read own profile', () => {
        const context = {
          userId: 'lecturer-1',
          targetUserId: 'lecturer-1'
        };
        expect(permissionService.hasPermission(UserRole.LECTURER, 'users', 'read', context)).toBe(true);
      });

      it('should deny lecturer access to other profiles', () => {
        const context = {
          userId: 'lecturer-1',
          targetUserId: 'lecturer-2'
        };
        expect(permissionService.hasPermission(UserRole.LECTURER, 'users', 'read', context)).toBe(false);
      });

      it('should allow lecturer to read venues', () => {
        expect(permissionService.hasPermission(UserRole.LECTURER, 'venues', 'read')).toBe(true);
      });

      it('should deny lecturer venue creation', () => {
        expect(permissionService.hasPermission(UserRole.LECTURER, 'venues', 'create')).toBe(false);
      });

      it('should allow lecturer to read assigned courses', () => {
        const context = {
          userId: 'lecturer-1',
          assignedLecturers: ['lecturer-1', 'lecturer-2']
        };
        expect(permissionService.hasPermission(UserRole.LECTURER, 'courses', 'read', context)).toBe(true);
      });

      it('should deny lecturer access to unassigned courses', () => {
        const context = {
          userId: 'lecturer-1',
          assignedLecturers: ['lecturer-2', 'lecturer-3']
        };
        expect(permissionService.hasPermission(UserRole.LECTURER, 'courses', 'read', context)).toBe(false);
      });

      it('should allow lecturer to update own availability', () => {
        const context = {
          userId: 'lecturer-1',
          resourceOwnerId: 'lecturer-1'
        };
        expect(permissionService.hasPermission(UserRole.LECTURER, 'availability', 'update', context)).toBe(true);
      });
    });

    describe('Student permissions', () => {
      it('should allow student to read own profile', () => {
        const context = {
          userId: 'student-1',
          targetUserId: 'student-1'
        };
        expect(permissionService.hasPermission(UserRole.STUDENT, 'users', 'read', context)).toBe(true);
      });

      it('should deny student access to other profiles', () => {
        const context = {
          userId: 'student-1',
          targetUserId: 'student-2'
        };
        expect(permissionService.hasPermission(UserRole.STUDENT, 'users', 'read', context)).toBe(false);
      });

      it('should allow student to read enrolled courses', () => {
        const context = {
          userId: 'student-1',
          enrolledStudents: ['student-1', 'student-2']
        };
        expect(permissionService.hasPermission(UserRole.STUDENT, 'courses', 'read', context)).toBe(true);
      });

      it('should deny student access to non-enrolled courses', () => {
        const context = {
          userId: 'student-1',
          enrolledStudents: ['student-2', 'student-3']
        };
        expect(permissionService.hasPermission(UserRole.STUDENT, 'courses', 'read', context)).toBe(false);
      });

      it('should deny student course creation', () => {
        expect(permissionService.hasPermission(UserRole.STUDENT, 'courses', 'create')).toBe(false);
      });

      it('should allow student to read schedules they are enrolled in', () => {
        const context = {
          userId: 'student-1',
          userRole: UserRole.STUDENT,
          scheduleStudents: ['student-1', 'student-2']
        };
        expect(permissionService.hasPermission(UserRole.STUDENT, 'schedules', 'read', context)).toBe(true);
      });
    });

    describe('Context-based permissions', () => {
      it('should handle missing context gracefully', () => {
        expect(permissionService.hasPermission(UserRole.LECTURER, 'users', 'read')).toBe(false);
      });

      it('should handle unknown conditions', () => {
        const context = {
          userId: 'user-1',
          unknownCondition: true
        };
        // This should fail because of unknown condition
        expect(permissionService.hasPermission(UserRole.LECTURER, 'users', 'read', context)).toBe(false);
      });
    });
  });

  describe('canAccessTenant', () => {
    it('should allow admin to access any tenant', () => {
      expect(permissionService.canAccessTenant(UserRole.ADMIN, 'tenant-1', 'tenant-2')).toBe(true);
    });

    it('should allow users to access their own tenant', () => {
      expect(permissionService.canAccessTenant(UserRole.LECTURER, 'tenant-1', 'tenant-1')).toBe(true);
      expect(permissionService.canAccessTenant(UserRole.STUDENT, 'tenant-1', 'tenant-1')).toBe(true);
    });

    it('should deny users access to other tenants', () => {
      expect(permissionService.canAccessTenant(UserRole.LECTURER, 'tenant-1', 'tenant-2')).toBe(false);
      expect(permissionService.canAccessTenant(UserRole.STUDENT, 'tenant-1', 'tenant-2')).toBe(false);
    });
  });

  describe('filterByTenant', () => {
    const resources = [
      { id: '1', name: 'Resource 1', tenantId: 'tenant-1' },
      { id: '2', name: 'Resource 2', tenantId: 'tenant-2' },
      { id: '3', name: 'Resource 3', tenantId: 'tenant-1' }
    ];

    it('should return all resources for admin', () => {
      const filtered = permissionService.filterByTenant(UserRole.ADMIN, 'tenant-1', resources);
      expect(filtered).toHaveLength(3);
    });

    it('should filter resources by tenant for non-admin users', () => {
      const filtered = permissionService.filterByTenant(UserRole.LECTURER, 'tenant-1', resources);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(r => r.tenantId === 'tenant-1')).toBe(true);
    });

    it('should return empty array if no resources match tenant', () => {
      const filtered = permissionService.filterByTenant(UserRole.STUDENT, 'tenant-3', resources);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return permissions for admin role', () => {
      const permissions = permissionService.getPermissionsForRole(UserRole.ADMIN);
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions.some(p => p.resource === '*' && p.action === '*')).toBe(true);
    });

    it('should return permissions for lecturer role', () => {
      const permissions = permissionService.getPermissionsForRole(UserRole.LECTURER);
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions.some(p => p.resource === 'users' && p.action === 'read')).toBe(true);
    });

    it('should return permissions for student role', () => {
      const permissions = permissionService.getPermissionsForRole(UserRole.STUDENT);
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions.some(p => p.resource === 'schedules' && p.action === 'read')).toBe(true);
    });
  });
});