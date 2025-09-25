import { createBaseStore } from './baseStore';
import { lecturerApi } from '../services/lecturerApi';
import { Lecturer, CreateLecturerRequest, UpdateLecturerRequest } from '../types/entities';

// Create lecturer store using the base store factory
export const useLecturerStore = createBaseStore<Lecturer, CreateLecturerRequest, UpdateLecturerRequest>(
  'lecturer',
  {
    getItems: (params) => lecturerApi.getLecturers(params),
    getItem: (id) => lecturerApi.getLecturer(id),
    createItem: (lecturer) => lecturerApi.createLecturer(lecturer),
    updateItem: (id, lecturer) => lecturerApi.updateLecturer(id, lecturer),
    deleteItem: (id) => lecturerApi.deleteLecturer(id),
  },
  {
    enableOptimisticUpdates: true,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes for lecturers
  }
);