import { BaseEntity, Equipment, Frequency } from './common';

export interface CourseConstraint {
  type: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  parameters: Record<string, unknown>;
}

export interface Course extends BaseEntity {
  name: string;
  code: string;
  duration: number; // minutes
  frequency: Frequency;
  requiredEquipment: Equipment[];
  studentGroups: string[]; // student group IDs
  lecturerId: string;
  constraints: CourseConstraint[];
  department: string;
  credits: number;
  description?: string;
  prerequisites?: string[]; // course IDs
  isActive: boolean;
}

export interface CreateCourseRequest {
  name: string;
  code: string;
  duration: number;
  frequency: Frequency;
  requiredEquipment: Equipment[];
  studentGroups: string[];
  lecturerId: string;
  constraints: CourseConstraint[];
  department: string;
  credits: number;
  description?: string;
  prerequisites?: string[];
}

export interface UpdateCourseRequest extends Partial<CreateCourseRequest> {
  id: string;
}

export interface CourseFilter {
  department?: string;
  lecturerId?: string;
  studentGroupId?: string;
  isActive?: boolean;
  credits?: number;
  requiredEquipment?: Equipment[];
}