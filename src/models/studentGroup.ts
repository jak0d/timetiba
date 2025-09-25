import { BaseEntity } from './common';

export interface StudentGroup extends BaseEntity {
  name: string;
  size: number;
  courses: string[]; // course IDs
  yearLevel: number;
  department: string;
  program?: string;
  semester?: number;
  academicYear?: string;
  isActive: boolean;
}

export interface CreateStudentGroupRequest {
  name: string;
  size: number;
  courses: string[];
  yearLevel: number;
  department: string;
  program?: string;
  semester?: number;
  academicYear?: string;
}

export interface UpdateStudentGroupRequest extends Partial<CreateStudentGroupRequest> {
  id: string;
}

export interface StudentGroupFilter {
  department?: string;
  yearLevel?: number;
  program?: string;
  semester?: number;
  academicYear?: string;
  isActive?: boolean;
  courseId?: string;
}