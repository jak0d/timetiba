import { Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  role: 'admin' | 'lecturer' | 'student';
  name: string;
}

export interface TestVenue {
  name: string;
  capacity: number;
  equipment: string[];
  location: string;
}

export interface TestLecturer {
  name: string;
  email: string;
  department: string;
  subjects: string[];
}

export interface TestCourse {
  name: string;
  code: string;
  duration: number;
  frequency: string;
  lecturerEmail: string;
}

export interface TestStudentGroup {
  name: string;
  size: number;
  yearLevel: number;
  department: string;
}

export const testUsers: TestUser[] = [
  {
    email: 'admin@test.com',
    password: 'admin123',
    role: 'admin',
    name: 'Test Administrator'
  },
  {
    email: 'lecturer@test.com',
    password: 'lecturer123',
    role: 'lecturer',
    name: 'Dr. Jane Smith'
  },
  {
    email: 'student@test.com',
    password: 'student123',
    role: 'student',
    name: 'John Doe'
  }
];

export const testVenues: TestVenue[] = [
  {
    name: 'Lecture Hall A',
    capacity: 100,
    equipment: ['Projector', 'Microphone', 'Whiteboard'],
    location: 'Building 1, Floor 1'
  },
  {
    name: 'Computer Lab 1',
    capacity: 30,
    equipment: ['Computers', 'Projector', 'Air Conditioning'],
    location: 'Building 2, Floor 2'
  },
  {
    name: 'Seminar Room B',
    capacity: 25,
    equipment: ['Whiteboard', 'TV Screen'],
    location: 'Building 1, Floor 2'
  }
];

export const testLecturers: TestLecturer[] = [
  {
    name: 'Dr. Jane Smith',
    email: 'lecturer@test.com',
    department: 'Computer Science',
    subjects: ['Data Structures', 'Algorithms', 'Database Systems']
  },
  {
    name: 'Prof. John Wilson',
    email: 'wilson@test.com',
    department: 'Mathematics',
    subjects: ['Calculus', 'Linear Algebra', 'Statistics']
  }
];

export const testCourses: TestCourse[] = [
  {
    name: 'Data Structures and Algorithms',
    code: 'CS201',
    duration: 120,
    frequency: 'weekly',
    lecturerEmail: 'lecturer@test.com'
  },
  {
    name: 'Database Systems',
    code: 'CS301',
    duration: 90,
    frequency: 'weekly',
    lecturerEmail: 'lecturer@test.com'
  },
  {
    name: 'Calculus I',
    code: 'MATH101',
    duration: 90,
    frequency: 'weekly',
    lecturerEmail: 'wilson@test.com'
  }
];

export const testStudentGroups: TestStudentGroup[] = [
  {
    name: 'CS Year 2 Group A',
    size: 30,
    yearLevel: 2,
    department: 'Computer Science'
  },
  {
    name: 'CS Year 3 Group B',
    size: 25,
    yearLevel: 3,
    department: 'Computer Science'
  },
  {
    name: 'Math Year 1 Group A',
    size: 40,
    yearLevel: 1,
    department: 'Mathematics'
  }
];

export class TestDataHelper {
  constructor(private page: Page) {}

  async loginAs(userType: 'admin' | 'lecturer' | 'student') {
    const user = testUsers.find(u => u.role === userType);
    if (!user) throw new Error(`No test user found for role: ${userType}`);

    await this.page.goto('/login');
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for navigation to dashboard
    await this.page.waitForURL('/dashboard');
  }

  async createVenue(venue: TestVenue) {
    await this.page.goto('/venues');
    await this.page.click('[data-testid="add-venue-button"]');
    
    await this.page.fill('[data-testid="venue-name-input"]', venue.name);
    await this.page.fill('[data-testid="venue-capacity-input"]', venue.capacity.toString());
    await this.page.fill('[data-testid="venue-location-input"]', venue.location);
    
    // Add equipment
    for (const equipment of venue.equipment) {
      await this.page.click('[data-testid="add-equipment-button"]');
      await this.page.fill('[data-testid="equipment-input"]:last-child', equipment);
    }
    
    await this.page.click('[data-testid="save-venue-button"]');
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  async createLecturer(lecturer: TestLecturer) {
    await this.page.goto('/lecturers');
    await this.page.click('[data-testid="add-lecturer-button"]');
    
    await this.page.fill('[data-testid="lecturer-name-input"]', lecturer.name);
    await this.page.fill('[data-testid="lecturer-email-input"]', lecturer.email);
    await this.page.fill('[data-testid="lecturer-department-input"]', lecturer.department);
    
    // Add subjects
    for (const subject of lecturer.subjects) {
      await this.page.click('[data-testid="add-subject-button"]');
      await this.page.fill('[data-testid="subject-input"]:last-child', subject);
    }
    
    await this.page.click('[data-testid="save-lecturer-button"]');
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  async createCourse(course: TestCourse) {
    await this.page.goto('/courses');
    await this.page.click('[data-testid="add-course-button"]');
    
    await this.page.fill('[data-testid="course-name-input"]', course.name);
    await this.page.fill('[data-testid="course-code-input"]', course.code);
    await this.page.fill('[data-testid="course-duration-input"]', course.duration.toString());
    await this.page.selectOption('[data-testid="course-frequency-select"]', course.frequency);
    await this.page.selectOption('[data-testid="course-lecturer-select"]', course.lecturerEmail);
    
    await this.page.click('[data-testid="save-course-button"]');
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  async createStudentGroup(group: TestStudentGroup) {
    await this.page.goto('/student-groups');
    await this.page.click('[data-testid="add-group-button"]');
    
    await this.page.fill('[data-testid="group-name-input"]', group.name);
    await this.page.fill('[data-testid="group-size-input"]', group.size.toString());
    await this.page.fill('[data-testid="group-year-input"]', group.yearLevel.toString());
    await this.page.fill('[data-testid="group-department-input"]', group.department);
    
    await this.page.click('[data-testid="save-group-button"]');
    await this.page.waitForSelector('[data-testid="success-message"]');
  }
}