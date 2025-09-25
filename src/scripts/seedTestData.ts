import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { testUsers, testVenues, testLecturers, testCourses, testStudentGroups } from '../../e2e/fixtures/test-data';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/ai_timetabler_test'
});

async function seedTestData() {
  const client = await pool.connect();
  
  try {
    console.log('Seeding test data...');
    
    // Clear existing data
    await client.query('TRUNCATE TABLE users, venues, lecturers, courses, student_groups, schedules, scheduled_sessions CASCADE');
    
    // Seed users
    for (const user of testUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await client.query(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
        [user.email, hashedPassword, user.name, user.role]
      );
    }
    
    // Seed venues
    for (const venue of testVenues) {
      await client.query(
        'INSERT INTO venues (name, capacity, equipment, location) VALUES ($1, $2, $3, $4)',
        [venue.name, venue.capacity, JSON.stringify(venue.equipment), venue.location]
      );
    }
    
    // Seed lecturers
    for (const lecturer of testLecturers) {
      await client.query(
        'INSERT INTO lecturers (name, email, department, subjects, availability, preferences) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          lecturer.name,
          lecturer.email,
          lecturer.department,
          JSON.stringify(lecturer.subjects),
          JSON.stringify({}), // Default availability
          JSON.stringify({}) // Default preferences
        ]
      );
    }
    
    // Seed courses
    for (const course of testCourses) {
      const lecturerResult = await client.query('SELECT id FROM lecturers WHERE email = $1', [course.lecturerEmail]);
      const lecturerId = lecturerResult.rows[0]?.id;
      
      if (lecturerId) {
        await client.query(
          'INSERT INTO courses (name, code, duration, frequency, lecturer_id, requirements) VALUES ($1, $2, $3, $4, $5, $6)',
          [course.name, course.code, course.duration, course.frequency, lecturerId, JSON.stringify({})]
        );
      }
    }
    
    // Seed student groups
    for (const group of testStudentGroups) {
      await client.query(
        'INSERT INTO student_groups (name, size, year_level, department) VALUES ($1, $2, $3, $4)',
        [group.name, group.size, group.yearLevel, group.department]
      );
    }
    
    console.log('Test data seeded successfully');
    
  } catch (error) {
    console.error('Error seeding test data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  seedTestData()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedTestData };