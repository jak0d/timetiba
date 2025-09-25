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
import { Lecturer, WeeklyAvailability } from '../types/entities';
import { LecturerForm } from '../components/lecturers/LecturerForm';
import { LecturerList } from '../components/lecturers/LecturerList';
import { LecturerAvailability } from '../components/lecturers/LecturerAvailability';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';

const Lecturers: React.FC = () => {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [filteredLecturers, setFilteredLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  // Selected items
  const [selectedLecturer, setSelectedLecturer] = useState<Lecturer | null>(null);
  const [lecturerToDelete, setLecturerToDelete] = useState<string | null>(null);

  // Mock data for development - replace with API calls
  useEffect(() => {
    const mockLecturers: Lecturer[] = [
      {
        id: '1',
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@university.edu',
        department: 'Computer Science',
        subjects: ['Data Structures', 'Algorithms', 'Software Engineering'],
        maxHoursPerDay: 6,
        maxHoursPerWeek: 30,
        availability: {
          monday: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '14:00', endTime: '16:00' }],
          tuesday: [{ startTime: '10:00', endTime: '15:00' }],
          wednesday: [{ startTime: '09:00', endTime: '11:00' }],
          thursday: [{ startTime: '13:00', endTime: '17:00' }],
          friday: [{ startTime: '09:00', endTime: '12:00' }],
          saturday: [],
          sunday: [],
        },
        preferences: {
          preferredTimeSlots: [{ startTime: '09:00', endTime: '12:00' }],
          avoidTimeSlots: [{ startTime: '17:00', endTime: '19:00' }],
          maxConsecutiveHours: 4,
          preferredBreakDuration: 15,
          preferredVenues: [],
        },
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20'),
      },
      {
        id: '2',
        name: 'Prof. Michael Chen',
        email: 'michael.chen@university.edu',
        department: 'Mathematics',
        subjects: ['Calculus', 'Linear Algebra', 'Statistics'],
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        availability: {
          monday: [{ startTime: '08:00', endTime: '12:00' }],
          tuesday: [{ startTime: '08:00', endTime: '12:00' }],
          wednesday: [{ startTime: '08:00', endTime: '12:00' }],
          thursday: [{ startTime: '08:00', endTime: '12:00' }],
          friday: [{ startTime: '08:00', endTime: '12:00' }],
          saturday: [],
          sunday: [],
        },
        preferences: {
          preferredTimeSlots: [{ startTime: '08:00', endTime: '12:00' }],
          avoidTimeSlots: [],
          maxConsecutiveHours: 4,
          preferredBreakDuration: 10,
          preferredVenues: [],
        },
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-18'),
      },
    ];

    setTimeout(() => {
      setLecturers(mockLecturers);
      setFilteredLecturers(mockLecturers);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter lecturers based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredLecturers(lecturers);
    } else {
      const filtered = lecturers.filter(lecturer =>
        lecturer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lecturer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lecturer.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lecturer.subjects.some(subject => 
          subject.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredLecturers(filtered);
    }
  }, [searchTerm, lecturers]);

  const handleAddLecturer = () => {
    setSelectedLecturer(null);
    setFormOpen(true);
  };

  const handleEditLecturer = (lecturer: Lecturer) => {
    setSelectedLecturer(lecturer);
    setFormOpen(true);
  };

  const handleViewLecturer = (lecturer: Lecturer) => {
    // For now, just edit - could implement a separate view dialog
    handleEditLecturer(lecturer);
  };

  const handleManageAvailability = (lecturer: Lecturer) => {
    setSelectedLecturer(lecturer);
    setAvailabilityOpen(true);
  };

  const handleDeleteLecturer = (lecturerId: string) => {
    setLecturerToDelete(lecturerId);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (lecturerToDelete) {
      setLecturers(prev => prev.filter(lecturer => lecturer.id !== lecturerToDelete));
      setLecturerToDelete(null);
    }
    setConfirmDeleteOpen(false);
  };

  const handleSubmitLecturer = (lecturerData: Omit<Lecturer, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (selectedLecturer) {
      // Update existing lecturer
      setLecturers(prev => prev.map(lecturer =>
        lecturer.id === selectedLecturer.id
          ? { ...lecturer, ...lecturerData, updatedAt: new Date() }
          : lecturer
      ));
    } else {
      // Add new lecturer
      const newLecturer: Lecturer = {
        ...lecturerData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setLecturers(prev => [...prev, newLecturer]);
    }
    setFormOpen(false);
  };

  const handleSaveAvailability = (lecturerId: string, availability: WeeklyAvailability) => {
    setLecturers(prev => prev.map(lecturer =>
      lecturer.id === lecturerId
        ? { ...lecturer, availability, updatedAt: new Date() }
        : lecturer
    ));
  };

  if (loading) {
    return <LoadingSpinner message="Loading lecturers..." />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Lecturers
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage lecturer profiles, availability, and preferences.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddLecturer}
        >
          Add Lecturer
        </Button>
      </Box>

      {error && (
        <ErrorMessage message={error} />
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search lecturers by name, email, department, or subjects..."
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

      <LecturerList
        lecturers={filteredLecturers}
        onEdit={handleEditLecturer}
        onDelete={handleDeleteLecturer}
        onView={handleViewLecturer}
        onManageAvailability={handleManageAvailability}
      />

      <LecturerForm
        open={formOpen}
        lecturer={selectedLecturer}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmitLecturer}
      />

      <LecturerAvailability
        open={availabilityOpen}
        lecturer={selectedLecturer}
        onClose={() => setAvailabilityOpen(false)}
        onSave={handleSaveAvailability}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete Lecturer"
        message="Are you sure you want to delete this lecturer? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </Box>
  );
};

export default Lecturers;