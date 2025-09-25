import { createBaseStore } from './baseStore';
import { courseApi } from '../services/courseApi';
import { Course, CreateCourseRequest, UpdateCourseRequest } from '../types/entities';

// Create course store using the base store factory
export const useCourseStore = createBaseStore<Course, CreateCourseRequest, UpdateCourseRequest>(
  'course',
  {
    getItems: (params) => courseApi.getCourses(params),
    getItem: (id) => courseApi.getCourse(id),
    createItem: (course) => courseApi.createCourse(course),
    updateItem: (id, course) => courseApi.updateCourse(id, course),
    deleteItem: (id) => courseApi.deleteCourse(id),
  },
  {
    enableOptimisticUpdates: true,
    cacheTimeout: 15 * 60 * 1000, // 15 minutes for courses
  }
);