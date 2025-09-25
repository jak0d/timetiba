import { UserRole } from '../models/user';
import { Permission, RolePermissions } from '../types/auth';

export class PermissionService {
  private rolePermissions: RolePermissions;

  constructor() {
    this.rolePermissions = this.initializeRolePermissions();
  }

  private initializeRolePermissions(): RolePermissions {
    return {
      [UserRole.ADMIN]: [
        // Full access to all resources
        { resource: '*', action: '*' },
        
        // User management
        { resource: 'users', action: 'create' },
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'update' },
        { resource: 'users', action: 'delete' },
        
        // System configuration
        { resource: 'system', action: 'configure' },
        { resource: 'system', action: 'monitor' },
        
        // All entity management
        { resource: 'venues', action: '*' },
        { resource: 'lecturers', action: '*' },
        { resource: 'courses', action: '*' },
        { resource: 'student-groups', action: '*' },
        { resource: 'schedules', action: '*' },
        
        // AI and optimization
        { resource: 'ai-optimization', action: '*' },
        { resource: 'conflict-resolution', action: '*' },
        
        // Notifications and exports
        { resource: 'notifications', action: '*' },
        { resource: 'exports', action: '*' }
      ],

      [UserRole.LECTURER]: [
        // Own profile management
        { resource: 'users', action: 'read', conditions: { ownProfile: true } },
        { resource: 'users', action: 'update', conditions: { ownProfile: true } },
        
        // Lecturer-specific data
        { resource: 'lecturers', action: 'read', conditions: { ownData: true } },
        { resource: 'lecturers', action: 'update', conditions: { ownData: true } },
        
        // View-only access to related entities
        { resource: 'venues', action: 'read' },
        { resource: 'courses', action: 'read', conditions: { assignedTo: true } },
        { resource: 'student-groups', action: 'read', conditions: { enrolledIn: true } },
        
        // Schedule access
        { resource: 'schedules', action: 'read', conditions: { involvedIn: true } },
        { resource: 'schedules', action: 'export', conditions: { involvedIn: true } },
        
        // Availability and preferences
        { resource: 'availability', action: 'read', conditions: { ownData: true } },
        { resource: 'availability', action: 'update', conditions: { ownData: true } },
        { resource: 'preferences', action: 'read', conditions: { ownData: true } },
        { resource: 'preferences', action: 'update', conditions: { ownData: true } },
        
        // Notifications
        { resource: 'notifications', action: 'read', conditions: { targetUser: true } },
        { resource: 'notifications', action: 'acknowledge', conditions: { targetUser: true } }
      ],

      [UserRole.STUDENT]: [
        // Own profile management (limited)
        { resource: 'users', action: 'read', conditions: { ownProfile: true } },
        { resource: 'users', action: 'update', conditions: { ownProfile: true, limitedFields: ['firstName', 'lastName'] } },
        
        // View-only access to related entities
        { resource: 'venues', action: 'read', conditions: { enrolledIn: true } },
        { resource: 'lecturers', action: 'read', conditions: { enrolledWith: true } },
        { resource: 'courses', action: 'read', conditions: { enrolledIn: true } },
        { resource: 'student-groups', action: 'read', conditions: { memberOf: true } },
        
        // Schedule access (read-only)
        { resource: 'schedules', action: 'read', conditions: { involvedIn: true } },
        { resource: 'schedules', action: 'export', conditions: { involvedIn: true } },
        
        // Notifications
        { resource: 'notifications', action: 'read', conditions: { targetUser: true } },
        { resource: 'notifications', action: 'acknowledge', conditions: { targetUser: true } }
      ]
    };
  }

  hasPermission(userRole: UserRole, resource: string, action: string, context?: Record<string, any>): boolean {
    const permissions = this.rolePermissions[userRole];
    
    // Check for wildcard permissions first
    const wildcardPermission = permissions.find(p => 
      (p.resource === '*' && p.action === '*') ||
      (p.resource === resource && p.action === '*') ||
      (p.resource === '*' && p.action === action)
    );
    
    if (wildcardPermission) {
      return this.checkConditions(wildcardPermission.conditions, context);
    }
    
    // Check for specific permission
    const specificPermission = permissions.find(p => 
      p.resource === resource && p.action === action
    );
    
    if (specificPermission) {
      return this.checkConditions(specificPermission.conditions, context);
    }
    
    return false;
  }

  private checkConditions(conditions?: Record<string, any>, context?: Record<string, any>): boolean {
    if (!conditions) {
      return true; // No conditions means permission is granted
    }
    
    if (!context) {
      return false; // Conditions exist but no context provided
    }
    
    // Check each condition
    for (const [key, value] of Object.entries(conditions)) {
      switch (key) {
        case 'ownProfile':
          if (value && context['userId'] !== context['targetUserId']) {
            return false;
          }
          break;
          
        case 'ownData':
          if (value && context['userId'] !== context['resourceOwnerId']) {
            return false;
          }
          break;
          
        case 'assignedTo':
          if (value && !context['assignedLecturers']?.includes(context['userId'])) {
            return false;
          }
          break;
          
        case 'enrolledIn':
          if (value && !context['enrolledStudents']?.includes(context['userId'])) {
            return false;
          }
          break;
          
        case 'enrolledWith':
          if (value && !context['lecturerStudents']?.includes(context['userId'])) {
            return false;
          }
          break;
          
        case 'memberOf':
          if (value && !context['groupMembers']?.includes(context['userId'])) {
            return false;
          }
          break;
          
        case 'involvedIn':
          if (value && !this.isUserInvolvedInSchedule(context)) {
            return false;
          }
          break;
          
        case 'targetUser':
          if (value && context['userId'] !== context['notificationTargetId']) {
            return false;
          }
          break;
          
        case 'limitedFields':
          // This is handled at the application level
          break;
          
        default:
          // Unknown condition, deny access
          return false;
      }
    }
    
    return true;
  }

  private isUserInvolvedInSchedule(context: Record<string, any>): boolean {
    const userId = context['userId'];
    const userRole = context['userRole'];
    
    switch (userRole) {
      case UserRole.LECTURER:
        return context['scheduleLecturers']?.includes(userId) || false;
      case UserRole.STUDENT:
        return context['scheduleStudents']?.includes(userId) || false;
      default:
        return false;
    }
  }

  getPermissionsForRole(role: UserRole): Permission[] {
    return this.rolePermissions[role] || [];
  }

  canAccessTenant(userRole: UserRole, userTenantId: string, resourceTenantId: string): boolean {
    // Admin can access all tenants
    if (userRole === UserRole.ADMIN) {
      return true;
    }
    
    // Other roles can only access their own tenant
    return userTenantId === resourceTenantId;
  }

  filterByTenant<T extends { tenantId: string }>(
    userRole: UserRole, 
    userTenantId: string, 
    resources: T[]
  ): T[] {
    if (userRole === UserRole.ADMIN) {
      return resources; // Admin can see all
    }
    
    return resources.filter(resource => resource.tenantId === userTenantId);
  }
}