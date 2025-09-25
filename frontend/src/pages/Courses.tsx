import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  TextField,
  InputAdornment,
  Paper,
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { Course } from '../types/entities';
import { CourseForm } from '../components/courses/CourseForm';
import { CourseList } from '../components/courses/CourseList';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  // Selected items
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

  // Mock data for lecturers and student groups
  const mockLecturers = [
    { id: '1', name: 'Dr. Sarah Johnson' },
    { id: '2', name: 'Prof. Michael Chen' },
    { id: '3', name: 'Dr. Emily Rodriguez' },
  ];

  const mockStudentGroups = [
    { id: '1', name: 'CS Year 1 Group A' },
    { id: '2', name: 'CS Year 1 Group B' },
    { id: '3', name: 'CS Year 2 Group A' },
    { id: '4', name: 'Math Year 1 Group A' },
  ];

  // Mock data for development - replace with API calls
  useEffect(() => {
    const mockCourses: Course[] = [
      {
        id: '1',
        name: 'Data Structures and Algorithms',
        code: 'CS201',
        duration: 90,
        frequency: 'weekly' as any,
        lecturerId: '1',
        studentGroups: ['1', '2'],
        requiredEquipment: [
          { id: '1', name: 'Digital Projector', type: 'projector' as any },
          { id: '2', name: 'Whiteboard', type: 'whiteboard' as any },
        ],
        constraints: [
          {
            id: '1',
            type: 'lecturer_preference' as any,
            description: 'Prefer morning sessions',
            priority: 'medium' as any,
          },
        ],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20'),
      },
      {
        id: '2',
        name: 'Calculus I',
        code: 'MATH101',
        duration: 60,
        frequency: 'weekly' as any,
        lecturerId: '2',
        studentGroups: ['4'],
        requiredEquipment: [
          { id: '3', name: 'Interactive Whiteboard', type: 'whiteboard' as any },
        ],
        constraints: [],
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-18'),
      },
    ];

    setTimeout(() => {
      setCourses(mockCourses);
      setFilteredCourses(mockCourses);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter courses based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredCourses(courses);
    } else {
      const filtered = courses.filter(course =>
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getLecturerName(course.lecturerId).toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCourses(filtered);
    }
  }, [searchTerm, courses]);

  const getLecturerName = (lecturerId: string) => {
    const lecturer = mockLecturers.find(l => l.id === lecturerId);
    return lecturer ? lecturer.name : 'Unknown Lecturer';
  };

  const getStudentGroupNames = (groupIds: string[]) => {
    return groupIds.map(id => {
      const group = mockStudentGroups.find(g => g.id === id);
      return group ? group.name : 'Unknown Group';
    });
  };

  const handleAddCourse = () => {
    setSelectedCourse(null);
    setFormOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setFormOpen(true);
  };

  const handleViewCourse = (course: Course) => {
    // For now, just edit - could implement a separate view dialog
    handleEditCourse(course);
  };

  const handleDeleteCourse = (courseId: string) => {
    setCourseToDelete(courseId);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (courseToDelete) {
      setCourses(prev => prev.filter(course => course.id !== courseToDelete));
      setCourseToDelete(null);
    }
    setConfirmDeleteOpen(false);
  };

  const handleSubmitCourse = (courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (selectedCourse) {
      // Update existing course
      setCourses(prev => prev.map(course =>
        course.id === selectedCourse.id
          ? { ...course, ...courseData, updatedAt: new Date() }
          : course
      ));
    } else {
      // Add new course
      const newCourse: Course = {
        ...courseData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setCourses(prev => [...prev, newCourse]);
    }
    setFormOpen(false);
  };

  if (loading) {
    return <LoadingSpinner message="Loading courses..." />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Courses
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage course information, requirements, and student group assignments.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddCourse}
        >
          Add Course
        </Button>
      </Box>

      {error && (
        <ErrorMessage message={error} />
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search courses by name, code, or lecturer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <CourseList
        courses={filteredCourses}
        onEdit={handleEditCourse}
        onDelete={handleDeleteCourse}
        onView={handleViewCourse}
        getLecturerName={getLecturerName}
        getStudentGroupNames={getStudentGroupNames}
      />

      <CourseForm
        open={formOpen}
        course={selectedCourse}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmitCourse}
        availableLecturers={mockLecturers}
        availableStudentGroups={mockStudentGroups}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete Course"
        message="Are you sure you want to delete this course? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </Box>
  );
};

export default Courses;