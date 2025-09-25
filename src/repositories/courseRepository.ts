import { QueryResultRow } from 'pg';
import { AbstractBaseRepository } from './baseRepository';
import { 
  Course, 
  CourseConstraint, 
  CreateCourseRequest, 
  UpdateCourseRequest, 
  CourseFilter 
} from '../models/course';
import { Equipment, Frequency } from '../models/common';

interface CourseRow extends QueryResultRow {
  id: string;
  name: string;
  code: string;
  duration: number;
  frequency: string;
  required_equipment: string[];
  lecturer_id: string;
  department: string;
  credits: number;
  description?: string;
  prerequisites: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CourseConstraintRow extends QueryResultRow {
  id: string;
  type: string;
  description: string;
  priority: string;
  parameters: any;
}

interface CourseStudentGroupRow extends QueryResultRow {
  student_group_id: string;
}

export class CourseRepository extends AbstractBaseRepository<Course> {
  protected tableName = 'courses';

  protected mapRowToEntity(row: CourseRow): Course {
    const course: Course = {
      id: row.id,
      name: row.name,
      code: row.code,
      duration: row.duration,
      frequency: row.frequency as Frequency,
      requiredEquipment: row.required_equipment as Equipment[],
      studentGroups: [], // Will be loaded separately
      lecturerId: row.lecturer_id,
      constraints: [], // Will be loaded separately
      department: row.department,
      credits: row.credits,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    // Add optional properties if they exist
    if (row.description !== null && row.description !== undefined) {
      course.description = row.description;
    }
    if (row.prerequisites !== null && row.prerequisites !== undefined) {
      course.prerequisites = row.prerequisites;
    }

    return course;
  }

  protected getInsertFields(): string[] {
    return [
      'name', 'code', 'duration', 'frequency', 'required_equipment',
      'lecturer_id', 'department', 'credits', 'description', 'prerequisites'
    ];
  }

  protected getUpdateFields(): string[] {
    return [
      'name', 'code', 'duration', 'frequency', 'required_equipment',
      'lecturer_id', 'department', 'credits', 'description', 'prerequisites'
    ];
  }

  override async findById(id: string): Promise<Course | null> {
    const course = await super.findById(id);
    if (!course) {
      return null;
    }

    // Load student groups and constraints
    course.studentGroups = await this.getCourseStudentGroups(id);
    course.constraints = await this.getCourseConstraints(id);
    
    return course;
  }

  override async findAll(filters: CourseFilter = {}): Promise<Course[]> {
    let query = `SELECT * FROM ${this.tableName} WHERE is_active = true`;
    const params: unknown[] = [];
    let paramIndex = 1;

    // Handle department filter
    if (filters.department) {
      query += ` AND department = $${paramIndex}`;
      params.push(filters.department);
      paramIndex++;
    }

    // Handle lecturer filter
    if (filters.lecturerId) {
      query += ` AND lecturer_id = $${paramIndex}`;
      params.push(filters.lecturerId);
      paramIndex++;
    }

    // Handle isActive filter
    if (filters.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(filters.isActive);
      paramIndex++;
    }

    // Handle credits filter
    if (filters.credits !== undefined) {
      query += ` AND credits = $${paramIndex}`;
      params.push(filters.credits);
      paramIndex++;
    }

    // Handle required equipment filter
    if (filters.requiredEquipment && filters.requiredEquipment.length > 0) {
      query += ` AND required_equipment @> $${paramIndex}`;
      params.push(filters.requiredEquipment);
      paramIndex++;
    }

    query += ' ORDER BY name';

    const result = await this.db.query<CourseRow>(query, params);
    const courses = result.rows.map(row => this.mapRowToEntity(row));

    // Load student groups and constraints for all courses
    for (const course of courses) {
      course.studentGroups = await this.getCourseStudentGroups(course.id);
      course.constraints = await this.getCourseConstraints(course.id);
    }

    // Filter by student group if specified
    if (filters.studentGroupId) {
      return courses.filter(course => 
        course.studentGroups.includes(filters.studentGroupId!)
      );
    }

    return courses;
  }

  override async create(data: CreateCourseRequest): Promise<Course> {
    return await this.db.transaction(async (trx) => {
      // Create course
      const courseResult = await trx.query<CourseRow>(
        `INSERT INTO courses (name, code, duration, frequency, required_equipment, lecturer_id, department, credits, description, prerequisites)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          data.name,
          data.code,
          data.duration,
          data.frequency,
          data.requiredEquipment,
          data.lecturerId,
          data.department,
          data.credits,
          data.description,
          data.prerequisites
        ]
      );

      const courseRow = courseResult.rows[0];
      if (!courseRow) {
        throw new Error('Failed to create course');
      }
      const course = this.mapRowToEntity(courseRow);

      // Link student groups
      if (data.studentGroups && data.studentGroups.length > 0) {
        await this.setCourseStudentGroups(course.id, data.studentGroups, trx);
        course.studentGroups = data.studentGroups;
      }

      // Create constraints
      if (data.constraints && data.constraints.length > 0) {
        await this.setCourseConstraints(course.id, data.constraints, trx);
        course.constraints = data.constraints;
      }

      return course;
    });
  }

  override async update(id: string, data: UpdateCourseRequest): Promise<Course | null> {
    return await this.db.transaction(async (trx) => {
      // Update course
      const updateData = { ...data };
      delete (updateData as any).studentGroups;
      delete (updateData as any).constraints;

      const course = await super.update(id, updateData);
      if (!course) {
        return null;
      }

      // Update student groups if provided
      if (data.studentGroups !== undefined) {
        await this.setCourseStudentGroups(id, data.studentGroups, trx);
        course.studentGroups = data.studentGroups;
      } else {
        course.studentGroups = await this.getCourseStudentGroups(id);
      }

      // Update constraints if provided
      if (data.constraints !== undefined) {
        await this.setCourseConstraints(id, data.constraints, trx);
        course.constraints = data.constraints;
      } else {
        course.constraints = await this.getCourseConstraints(id);
      }

      return course;
    });
  }

  async findByDepartment(department: string): Promise<Course[]> {
    return this.findAll({ department });
  }

  async findByLecturer(lecturerId: string): Promise<Course[]> {
    return this.findAll({ lecturerId });
  }

  async findByStudentGroup(studentGroupId: string): Promise<Course[]> {
    return this.findAll({ studentGroupId });
  }

  async findByEquipment(equipment: Equipment[]): Promise<Course[]> {
    return this.findAll({ requiredEquipment: equipment });
  }

  async addStudentGroup(courseId: string, studentGroupId: string): Promise<boolean> {
    try {
      await this.db.query(
        'INSERT INTO course_student_groups (course_id, student_group_id) VALUES ($1, $2)',
        [courseId, studentGroupId]
      );
      return true;
    } catch (error) {
      // Handle duplicate key error
      return false;
    }
  }

  async removeStudentGroup(courseId: string, studentGroupId: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM course_student_groups WHERE course_id = $1 AND student_group_id = $2',
      [courseId, studentGroupId]
    );
    return result.rowCount > 0;
  }

  async addConstraint(courseId: string, constraint: CourseConstraint): Promise<string> {
    const result = await this.db.query<{ id: string }>(
      `INSERT INTO course_constraints (course_id, type, description, priority, parameters)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [courseId, constraint.type, constraint.description, constraint.priority, constraint.parameters]
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to add constraint');
    }
    return row.id;
  }

  async removeConstraint(courseId: string, constraintId: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM course_constraints WHERE course_id = $1 AND id = $2',
      [courseId, constraintId]
    );
    return result.rowCount > 0;
  }

  private async getCourseStudentGroups(courseId: string): Promise<string[]> {
    const result = await this.db.query<CourseStudentGroupRow>(
      'SELECT student_group_id FROM course_student_groups WHERE course_id = $1',
      [courseId]
    );
    return result.rows.map(row => row.student_group_id);
  }

  private async setCourseStudentGroups(
    courseId: string, 
    studentGroupIds: string[], 
    trx?: any
  ): Promise<void> {
    const db = trx || this.db;

    // Delete existing relationships
    await db.query('DELETE FROM course_student_groups WHERE course_id = $1', [courseId]);

    // Insert new relationships
    if (studentGroupIds.length > 0) {
      const values = studentGroupIds.map((_, index) => 
        `($1, $${index + 2})`
      ).join(', ');

      await db.query(
        `INSERT INTO course_student_groups (course_id, student_group_id) VALUES ${values}`,
        [courseId, ...studentGroupIds]
      );
    }
  }

  private async getCourseConstraints(courseId: string): Promise<CourseConstraint[]> {
    const result = await this.db.query<CourseConstraintRow>(
      'SELECT * FROM course_constraints WHERE course_id = $1 ORDER BY created_at',
      [courseId]
    );

    return result.rows.map(row => ({
      type: row.type,
      description: row.description,
      priority: row.priority as 'high' | 'medium' | 'low',
      parameters: row.parameters
    }));
  }

  private async setCourseConstraints(
    courseId: string, 
    constraints: CourseConstraint[], 
    trx?: any
  ): Promise<void> {
    const db = trx || this.db;

    // Delete existing constraints
    await db.query('DELETE FROM course_constraints WHERE course_id = $1', [courseId]);

    // Insert new constraints
    if (constraints.length > 0) {
      const values = constraints.map((_, index) => {
        const baseIndex = index * 4;
        return `($1, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5})`;
      }).join(', ');

      const params = [courseId, ...constraints.flatMap(constraint => [
        constraint.type,
        constraint.description,
        constraint.priority,
        constraint.parameters
      ])];

      await db.query(
        `INSERT INTO course_constraints (course_id, type, description, priority, parameters) VALUES ${values}`,
        params
      );
    }
  }
}

// Export singleton instance
export const courseRepository = new CourseRepository();