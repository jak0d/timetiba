import { DatabaseConfig } from '../types/database';
import { initializeDatabase, closeDatabase, getDatabase } from './database';
import { migrationRunner } from './migrations';

/**
 * Test database configuration
 */
export const getTestDatabaseConfig = (): DatabaseConfig => {
  return {
    host: process.env['TEST_DB_HOST'] || 'localhost',
    port: parseInt(process.env['TEST_DB_PORT'] || '5432', 10),
    database: process.env['TEST_DB_NAME'] || 'ai_timetabler_test',
    username: process.env['TEST_DB_USER'] || 'postgres',
    password: process.env['TEST_DB_PASSWORD'] || 'password',
    ssl: process.env['TEST_DB_SSL'] === 'true',
    maxConnections: 5, // Smaller pool for tests
    idleTimeoutMillis: 10000
  };
};

/**
 * Setup test database - creates tables and runs migrations
 */
export const setupTestDatabase = async (): Promise<void> => {
  try {
    console.log('Setting up test database...');
    
    // Initialize database connection
    await initializeDatabase(getTestDatabaseConfig());
    
    // Run migrations to create tables
    await migrationRunner.runMigrations();
    
    console.log('Test database setup completed');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
};

/**
 * Teardown test database - cleans up data and closes connections
 */
export const teardownTestDatabase = async (): Promise<void> => {
  try {
    console.log('Tearing down test database...');
    
    // Clean up all data (but keep schema for faster subsequent tests)
    await cleanTestData();
    
    // Close database connections
    await closeDatabase();
    
    console.log('Test database teardown completed');
  } catch (error) {
    console.error('Failed to teardown test database:', error);
    throw error;
  }
};

/**
 * Clean all test data from tables (but keep schema)
 */
export const cleanTestData = async (): Promise<void> => {
  const db = getDatabase();
  
  await db.transaction(async (trx) => {
    // Delete data in reverse dependency order
    await trx.query('DELETE FROM resolutions');
    await trx.query('DELETE FROM clash_affected_sessions');
    await trx.query('DELETE FROM clash_affected_entities');
    await trx.query('DELETE FROM clashes');
    await trx.query('DELETE FROM constraint_rules');
    await trx.query('DELETE FROM constraint_entities');
    await trx.query('DELETE FROM constraints');
    await trx.query('DELETE FROM session_student_groups');
    await trx.query('DELETE FROM scheduled_sessions');
    await trx.query('DELETE FROM schedules');
    await trx.query('DELETE FROM course_constraints');
    await trx.query('DELETE FROM course_student_groups');
    await trx.query('DELETE FROM courses');
    await trx.query('DELETE FROM lecturer_preferred_time_slots');
    await trx.query('DELETE FROM lecturer_preferences');
    await trx.query('DELETE FROM lecturer_availability');
    await trx.query('DELETE FROM lecturers');
    await trx.query('DELETE FROM venue_availability');
    await trx.query('DELETE FROM venues');
    await trx.query('DELETE FROM student_groups');
  });
};

/**
 * Reset test database completely (drops and recreates all tables)
 */
export const resetTestDatabase = async (): Promise<void> => {
  try {
    console.log('Resetting test database...');
    
    // Reset database (drop all tables)
    await migrationRunner.resetDatabase();
    
    // Run migrations again to recreate tables
    await migrationRunner.runMigrations();
    
    console.log('Test database reset completed');
  } catch (error) {
    console.error('Failed to reset test database:', error);
    throw error;
  }
};

/**
 * Create test data for development and testing
 */
export const createTestData = async (): Promise<void> => {
  const db = getDatabase();
  
  console.log('Creating test data...');
  
  await db.transaction(async (trx) => {
    // Create test venues
    const venue1Result = await trx.query(`
      INSERT INTO venues (name, capacity, equipment, location, building, floor, room_number)
      VALUES ('Lecture Hall A', 100, ARRAY['projector', 'whiteboard']::equipment_type[], 'Building A, Floor 1', 'Building A', 1, 'A101')
      RETURNING id
    `);
    
    const venue2Result = await trx.query(`
      INSERT INTO venues (name, capacity, equipment, location, building, floor, room_number)
      VALUES ('Computer Lab 1', 30, ARRAY['computer', 'projector']::equipment_type[], 'Building B, Floor 2', 'Building B', 2, 'B201')
      RETURNING id
    `);
    
    const venue1Id = venue1Result.rows[0]?.['id'];
    const venue2Id = venue2Result.rows[0]?.['id'];
    
    // Add venue availability
    await trx.query(`
      INSERT INTO venue_availability (venue_id, day_of_week, start_time, end_time)
      VALUES 
        ($1, 'monday', '09:00', '17:00'),
        ($1, 'tuesday', '09:00', '17:00'),
        ($1, 'wednesday', '09:00', '17:00'),
        ($1, 'thursday', '09:00', '17:00'),
        ($1, 'friday', '09:00', '17:00')
    `, [venue1Id]);
    
    await trx.query(`
      INSERT INTO venue_availability (venue_id, day_of_week, start_time, end_time)
      VALUES 
        ($1, 'monday', '08:00', '18:00'),
        ($1, 'tuesday', '08:00', '18:00'),
        ($1, 'wednesday', '08:00', '18:00'),
        ($1, 'thursday', '08:00', '18:00'),
        ($1, 'friday', '08:00', '18:00')
    `, [venue2Id]);
    
    // Create test lecturers
    const lecturer1Result = await trx.query(`
      INSERT INTO lecturers (name, email, department, subjects, max_hours_per_day, max_hours_per_week, employee_id)
      VALUES ('Dr. John Smith', 'john.smith@university.edu', 'Computer Science', ARRAY['Programming', 'Data Structures'], 8, 40, 'EMP001')
      RETURNING id
    `);
    
    const lecturer2Result = await trx.query(`
      INSERT INTO lecturers (name, email, department, subjects, max_hours_per_day, max_hours_per_week, employee_id)
      VALUES ('Prof. Jane Doe', 'jane.doe@university.edu', 'Mathematics', ARRAY['Calculus', 'Statistics'], 6, 30, 'EMP002')
      RETURNING id
    `);
    
    const lecturer1Id = lecturer1Result.rows[0]?.['id'];
    const lecturer2Id = lecturer2Result.rows[0]?.['id'];
    
    // Add lecturer availability
    await trx.query(`
      INSERT INTO lecturer_availability (lecturer_id, day_of_week, start_time, end_time)
      VALUES 
        ($1, 'monday', '09:00', '17:00'),
        ($1, 'tuesday', '09:00', '17:00'),
        ($1, 'wednesday', '09:00', '17:00'),
        ($1, 'thursday', '09:00', '17:00'),
        ($1, 'friday', '09:00', '17:00')
    `, [lecturer1Id]);
    
    await trx.query(`
      INSERT INTO lecturer_availability (lecturer_id, day_of_week, start_time, end_time)
      VALUES 
        ($1, 'monday', '10:00', '16:00'),
        ($1, 'tuesday', '10:00', '16:00'),
        ($1, 'wednesday', '10:00', '16:00'),
        ($1, 'thursday', '10:00', '16:00')
    `, [lecturer2Id]);
    
    // Add lecturer preferences
    await trx.query(`
      INSERT INTO lecturer_preferences (lecturer_id, max_hours_per_day, max_hours_per_week, minimum_break_between_classes, avoid_back_to_back_classes)
      VALUES ($1, 8, 40, 15, false)
    `, [lecturer1Id]);
    
    await trx.query(`
      INSERT INTO lecturer_preferences (lecturer_id, max_hours_per_day, max_hours_per_week, minimum_break_between_classes, avoid_back_to_back_classes)
      VALUES ($1, 6, 30, 30, true)
    `, [lecturer2Id]);
    
    // Create test student groups
    const group1Result = await trx.query(`
      INSERT INTO student_groups (name, size, year_level, department, program, semester, academic_year)
      VALUES ('CS Year 1 Group A', 30, 1, 'Computer Science', 'Bachelor of Computer Science', 1, '2024-2025')
      RETURNING id
    `);
    
    const group2Result = await trx.query(`
      INSERT INTO student_groups (name, size, year_level, department, program, semester, academic_year)
      VALUES ('Math Year 2 Group B', 25, 2, 'Mathematics', 'Bachelor of Mathematics', 1, '2024-2025')
      RETURNING id
    `);
    
    const group1Id = group1Result.rows[0]?.['id'];
    const group2Id = group2Result.rows[0]?.['id'];
    
    // Create test courses
    const course1Result = await trx.query(`
      INSERT INTO courses (name, code, duration, frequency, required_equipment, lecturer_id, department, credits, description)
      VALUES ('Introduction to Programming', 'CS101', 90, 'weekly', ARRAY['computer', 'projector']::equipment_type[], $1, 'Computer Science', 3, 'Basic programming concepts')
      RETURNING id
    `, [lecturer1Id]);
    
    const course2Result = await trx.query(`
      INSERT INTO courses (name, code, duration, frequency, required_equipment, lecturer_id, department, credits, description)
      VALUES ('Calculus I', 'MATH101', 75, 'weekly', ARRAY['whiteboard']::equipment_type[], $1, 'Mathematics', 4, 'Differential and integral calculus')
      RETURNING id
    `, [lecturer2Id]);
    
    const course1Id = course1Result.rows[0]?.['id'];
    const course2Id = course2Result.rows[0]?.['id'];
    
    // Link courses to student groups
    await trx.query(`
      INSERT INTO course_student_groups (course_id, student_group_id)
      VALUES ($1, $2)
    `, [course1Id, group1Id]);
    
    await trx.query(`
      INSERT INTO course_student_groups (course_id, student_group_id)
      VALUES ($1, $2)
    `, [course2Id, group2Id]);
  });
  
  console.log('Test data created successfully');
};