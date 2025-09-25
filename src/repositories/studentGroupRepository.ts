import { QueryResultRow } from 'pg';
import { AbstractBaseRepository } from './baseRepository';
import { 
  StudentGroup, 
  CreateStudentGroupRequest, 
  UpdateStudentGroupRequest, 
  StudentGroupFilter 
} from '../models/studentGroup';

interface StudentGroupRow extends QueryResultRow {
  id: string;
  name: string;
  size: number;
  year_level: number;
  department: string;
  program?: string;
  semester?: number;
  academic_year?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface StudentGroupCourseRow extends QueryResultRow {
  course_id: string;
}

export class StudentGroupRepository extends AbstractBaseRepository<StudentGroup> {
  protected tableName = 'student_groups';

  protected mapRowToEntity(row: StudentGroupRow): StudentGroup {
    const studentGroup: StudentGroup = {
      id: row.id,
      name: row.name,
      size: row.size,
      courses: [], // Will be loaded separately
      yearLevel: row.year_level,
      department: row.department,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    // Add optional properties if they exist
    if (row.program !== null && row.program !== undefined) {
      studentGroup.program = row.program;
    }
    if (row.semester !== null && row.semester !== undefined) {
      studentGroup.semester = row.semester;
    }
    if (row.academic_year !== null && row.academic_year !== undefined) {
      studentGroup.academicYear = row.academic_year;
    }

    return studentGroup;
  }

  protected getInsertFields(): string[] {
    return [
      'name', 'size', 'year_level', 'department', 'program', 'semester', 'academic_year'
    ];
  }

  protected getUpdateFields(): string[] {
    return [
      'name', 'size', 'year_level', 'department', 'program', 'semester', 'academic_year'
    ];
  }

  override async findById(id: string): Promise<StudentGroup | null> {
    const studentGroup = await super.findById(id);
    if (!studentGroup) {
      return null;
    }

    // Load courses
    studentGroup.courses = await this.getStudentGroupCourses(id);
    
    return studentGroup;
  }

  override async findAll(filters: StudentGroupFilter = {}): Promise<StudentGroup[]> {
    let query = `SELECT * FROM ${this.tableName} WHERE is_active = true`;
    const params: unknown[] = [];
    let paramIndex = 1;

    // Handle department filter
    if (filters.department) {
      query += ` AND department = $${paramIndex}`;
      params.push(filters.department);
      paramIndex++;
    }

    // Handle year level filter
    if (filters.yearLevel !== undefined) {
      query += ` AND year_level = $${paramIndex}`;
      params.push(filters.yearLevel);
      paramIndex++;
    }

    // Handle program filter
    if (filters.program) {
      query += ` AND program = $${paramIndex}`;
      params.push(filters.program);
      paramIndex++;
    }

    // Handle semester filter
    if (filters.semester !== undefined) {
      query += ` AND semester = $${paramIndex}`;
      params.push(filters.semester);
      paramIndex++;
    }

    // Handle academic year filter
    if (filters.academicYear) {
      query += ` AND academic_year = $${paramIndex}`;
      params.push(filters.academicYear);
      paramIndex++;
    }

    // Handle isActive filter
    if (filters.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(filters.isActive);
      paramIndex++;
    }

    query += ' ORDER BY name';

    const result = await this.db.query<StudentGroupRow>(query, params);
    const studentGroups = result.rows.map(row => this.mapRowToEntity(row));

    // Load courses for all student groups
    for (const studentGroup of studentGroups) {
      studentGroup.courses = await this.getStudentGroupCourses(studentGroup.id);
    }

    // Filter by course if specified
    if (filters.courseId) {
      return studentGroups.filter(group => 
        group.courses.includes(filters.courseId!)
      );
    }

    return studentGroups;
  }

  override async create(data: CreateStudentGroupRequest): Promise<StudentGroup> {
    return await this.db.transaction(async (trx) => {
      // Create student group
      const studentGroupResult = await trx.query<StudentGroupRow>(
        `INSERT INTO student_groups (name, size, year_level, department, program, semester, academic_year)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          data.name,
          data.size,
          data.yearLevel,
          data.department,
          data.program,
          data.semester,
          data.academicYear
        ]
      );

      const studentGroupRow = studentGroupResult.rows[0];
      if (!studentGroupRow) {
        throw new Error('Failed to create student group');
      }
      const studentGroup = this.mapRowToEntity(studentGroupRow);

      // Link courses
      if (data.courses && data.courses.length > 0) {
        await this.setStudentGroupCourses(studentGroup.id, data.courses, trx);
        studentGroup.courses = data.courses;
      }

      return studentGroup;
    });
  }

  override async update(id: string, data: UpdateStudentGroupRequest): Promise<StudentGroup | null> {
    return await this.db.transaction(async (trx) => {
      // Update student group
      const updateData = { ...data };
      delete (updateData as any).courses;

      const studentGroup = await super.update(id, updateData);
      if (!studentGroup) {
        return null;
      }

      // Update courses if provided
      if (data.courses !== undefined) {
        await this.setStudentGroupCourses(id, data.courses, trx);
        studentGroup.courses = data.courses;
      } else {
        studentGroup.courses = await this.getStudentGroupCourses(id);
      }

      return studentGroup;
    });
  }

  async findByDepartment(department: string): Promise<StudentGroup[]> {
    return this.findAll({ department });
  }

  async findByYearLevel(yearLevel: number): Promise<StudentGroup[]> {
    return this.findAll({ yearLevel });
  }

  async findByProgram(program: string): Promise<StudentGroup[]> {
    return this.findAll({ program });
  }

  async findByAcademicYear(academicYear: string): Promise<StudentGroup[]> {
    return this.findAll({ academicYear });
  }

  async findByCourse(courseId: string): Promise<StudentGroup[]> {
    return this.findAll({ courseId });
  }

  async addCourse(studentGroupId: string, courseId: string): Promise<boolean> {
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

  async removeCourse(studentGroupId: string, courseId: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM course_student_groups WHERE course_id = $1 AND student_group_id = $2',
      [courseId, studentGroupId]
    );
    return result.rowCount > 0;
  }

  async getEnrollmentCount(studentGroupId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM course_student_groups WHERE student_group_id = $1',
      [studentGroupId]
    );
    const row = result.rows[0];
    if (!row) {
      return 0;
    }
    return parseInt(row.count, 10);
  }

  async findBySize(minSize?: number, maxSize?: number): Promise<StudentGroup[]> {
    let query = `SELECT * FROM ${this.tableName} WHERE is_active = true`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (minSize !== undefined) {
      query += ` AND size >= $${paramIndex}`;
      params.push(minSize);
      paramIndex++;
    }

    if (maxSize !== undefined) {
      query += ` AND size <= $${paramIndex}`;
      params.push(maxSize);
      paramIndex++;
    }

    query += ' ORDER BY name';

    const result = await this.db.query<StudentGroupRow>(query, params);
    const studentGroups = result.rows.map(row => this.mapRowToEntity(row));

    // Load courses for all student groups
    for (const studentGroup of studentGroups) {
      studentGroup.courses = await this.getStudentGroupCourses(studentGroup.id);
    }

    return studentGroups;
  }

  private async getStudentGroupCourses(studentGroupId: string): Promise<string[]> {
    const result = await this.db.query<StudentGroupCourseRow>(
      'SELECT course_id FROM course_student_groups WHERE student_group_id = $1',
      [studentGroupId]
    );
    return result.rows.map(row => row.course_id);
  }

  private async setStudentGroupCourses(
    studentGroupId: string, 
    courseIds: string[], 
    trx?: any
  ): Promise<void> {
    const db = trx || this.db;

    // Delete existing relationships
    await db.query('DELETE FROM course_student_groups WHERE student_group_id = $1', [studentGroupId]);

    // Insert new relationships
    if (courseIds.length > 0) {
      const values = courseIds.map((_, index) => 
        `($${index + 2}, $1)`
      ).join(', ');

      await db.query(
        `INSERT INTO course_student_groups (course_id, student_group_id) VALUES ${values}`,
        [studentGroupId, ...courseIds]
      );
    }
  }
}

// Export singleton instance
export const studentGroupRepository = new StudentGroupRepository();