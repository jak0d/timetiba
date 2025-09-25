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
export declare const testUsers: TestUser[];
export declare const testVenues: TestVenue[];
export declare const testLecturers: TestLecturer[];
export declare const testCourses: TestCourse[];
export declare const testStudentGroups: TestStudentGroup[];
export declare class TestDataHelper {
    private page;
    constructor(page: Page);
    loginAs(userType: 'admin' | 'lecturer' | 'student'): Promise<void>;
    createVenue(venue: TestVenue): Promise<void>;
    createLecturer(lecturer: TestLecturer): Promise<void>;
    createCourse(course: TestCourse): Promise<void>;
    createStudentGroup(group: TestStudentGroup): Promise<void>;
}
//# sourceMappingURL=test-data.d.ts.map