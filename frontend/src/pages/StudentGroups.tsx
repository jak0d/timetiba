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
import { StudentGroup } from '../types/entities';
import { StudentGroupForm } from '../components/student-groups/StudentGroupForm';
import { StudentGroupList } from '../components/student-groups/StudentGroupList';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';

const StudentGroups: React.FC = () => {
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
  const [filteredStudentGroups, setFilteredStudentGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  // Selected items
  const [selectedStudentGroup, setSelectedStudentGroup] = useState<StudentGroup | null>(null);
  const [studentGroupToDelete, setStudentGroupToDelete] = useState<string | null>(null);

  // Mock data for courses
  const mockCourses = [
    { id: '1', name: 'Data Structures and Algorithms', code: 'CS201' },
    { id: '2', name: 'Calculus I', code: 'MATH101' },
    { id: '3', name: 'Database Systems', code: 'CS301' },
    { id: '4', name: 'Linear Algebra', code: 'MATH201' },
  ];

  // Mock data for development - replace with API calls
  useEffect(() => {
    const mockStudentGroups: StudentGroup[] = [
      {
        id: '1',
        name: 'CS Year 1 Group A',
        size: 25,
        yearLevel: 1,
        department: 'Computer Science',
        courses: ['1', '2'],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20'),
      },
      {
        id: '2',
        name: 'CS Year 1 Group B',
        size: 28,
        yearLevel: 1,
        department: 'Computer Science',
        courses: ['1', '2'],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20'),
      },
      {
        id: '3',
        name: 'CS Year 2 Group A',
        size: 22,
        yearLevel: 2,
        department: 'Computer Science',
        courses: ['3'],
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-18'),
      },
      {
        id: '4',
        name: 'Math Year 1 Group A',
        size: 30,
        yearLevel: 1,
        department: 'Mathematics',
        courses: ['2', '4'],
        createdAt: new Date('2024-01-12'),
        updatedAt: new Date('2024-01-19'),
      },
    ];

    setTimeout(() => {
      setStudentGroups(mockStudentGroups);
      setFilteredStudentGroups(mockStudentGroups);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter student groups based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredStudentGroups(studentGroups);
    } else {
      const filtered = studentGroups.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.yearLevel.toString().includes(searchTerm)
      );
      setFilteredStudentGroups(filtered);
    }
  }, [searchTerm, studentGroups]);

  const getCourseNames = (courseIds: string[]) => {
    return courseIds.map(id => {
      const course = mockCourses.find(c => c.id === id);
      return course ? `${course.code} - ${course.name}` : 'Unknown Course';
    });
  };

  const handleAddStudentGroup = () => {
    setSelectedStudentGroup(null);
    setFormOpen(true);
  };

  const handleEditStudentGroup = (studentGroup: StudentGroup) => {
    setSelectedStudentGroup(studentGroup);
    setFormOpen(true);
  };

  const handleViewStudentGroup = (studentGroup: StudentGroup) => {
    // For now, just edit - could implement a separate view dialog
    handleEditStudentGroup(studentGroup);
  };

  const handleDeleteStudentGroup = (studentGroupId: string) => {
    setStudentGroupToDelete(studentGroupId);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (studentGroupToDelete) {
      setStudentGroups(prev => prev.filter(group => group.id !== studentGroupToDelete));
      setStudentGroupToDelete(null);
    }
    setConfirmDeleteOpen(false);
  };

  const handleSubmitStudentGroup = (studentGroupData: Omit<StudentGroup, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (selectedStudentGroup) {
      // Update existing student group
      setStudentGroups(prev => prev.map(group =>
        group.id === selectedStudentGroup.id
          ? { ...group, ...studentGroupData, updatedAt: new Date() }
          : group
      ));
    } else {
      // Add new student group
      const newStudentGroup: StudentGroup = {
        ...studentGroupData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setStudentGroups(prev => [...prev, newStudentGroup]);
    }
    setFormOpen(false);
  };

  if (loading) {
    return <LoadingSpinner message="Loading student groups..." />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Student Groups
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage student group compositions and course enrollments.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddStudentGroup}
        >
          Add Student Group
        </Button>
      </Box>

      {error && (
        <ErrorMessage message={error} />
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search student groups by name, department, or year level..."
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

      <StudentGroupList
        studentGroups={filteredStudentGroups}
        onEdit={handleEditStudentGroup}
        onDelete={handleDeleteStudentGroup}
        onView={handleViewStudentGroup}
        getCourseNames={getCourseNames}
      />

      <StudentGroupForm
        open={formOpen}
        studentGroup={selectedStudentGroup}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmitStudentGroup}
        availableCourses={mockCourses}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete Student Group"
        message="Are you sure you want to delete this student group? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </Box>
  );
};

export default StudentGroups;