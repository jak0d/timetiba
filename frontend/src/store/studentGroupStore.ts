import { createBaseStore } from './baseStore';
import { studentGroupApi } from '../services/studentGroupApi';
import { StudentGroup, CreateStudentGroupRequest, UpdateStudentGroupRequest } from '../types/entities';

// Create student group store using the base store factory
export const useStudentGroupStore = createBaseStore<StudentGroup, CreateStudentGroupRequest, UpdateStudentGroupRequest>(
  'studentGroup',
  {
    getItems: (params) => studentGroupApi.getStudentGroups(params),
    getItem: (id) => studentGroupApi.getStudentGroup(id),
    createItem: (group) => studentGroupApi.createStudentGroup(group),
    updateItem: (id, group) => studentGroupApi.updateStudentGroup(id, group),
    deleteItem: (id) => studentGroupApi.deleteStudentGroup(id),
  },
  {
    enableOptimisticUpdates: true,
    cacheTimeout: 10 * 60 * 1000, // 10 minutes for student groups
  }
);