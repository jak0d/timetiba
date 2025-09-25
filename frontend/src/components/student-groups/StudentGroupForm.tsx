import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  Chip,
  Autocomplete,
} from '@mui/material';
import { StudentGroup } from '../../types/entities';

interface StudentGroupFormProps {
  open: boolean;
  studentGroup?: StudentGroup;
  onClose: () => void;
  onSubmit: (studentGroup: Omit<StudentGroup, 'id' | 'createdAt' | 'updatedAt'>) => void;
  availableCourses?: { id: string; name: string; code: string }[];
}

export const StudentGroupForm: React.FC<StudentGroupFormProps> = ({
  open,
  studentGroup,
  onClose,
  onSubmit,
  availableCourses = [],
}) => {
  const [formData, setFormData] = useState({
    name: '',
    size: 0,
    yearLevel: 1,
    department: '',
    courses: [] as string[],
  });

  useEffect(() => {
    if (studentGroup) {
      setFormData({
        name: studentGroup.name,
        size: studentGroup.size,
        yearLevel: studentGroup.yearLevel,
        department: studentGroup.department,
        courses: studentGroup.courses,
      });
    } else {
      setFormData({
        name: '',
        size: 0,
        yearLevel: 1,
        department: '',
        courses: [],
      });
    }
  }, [studentGroup, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const getCourseName = (courseId: string) => {
    const course = availableCourses.find(c => c.id === courseId);
    return course ? `${course.code} - ${course.name}` : courseId;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {studentGroup ? 'Edit Student Group' : 'Add New Student Group'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Group Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                helperText="e.g., CS Year 1 Group A, Math Year 2 Group B"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Group Size"
                type="number"
                value={formData.size}
                onChange={(e) => setFormData(prev => ({ ...prev, size: parseInt(e.target.value) || 0 }))}
                required
                inputProps={{ min: 1, max: 500 }}
                helperText="Number of students"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                required
                helperText="e.g., Computer Science, Mathematics"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Year Level"
                type="number"
                value={formData.yearLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, yearLevel: parseInt(e.target.value) || 1 }))}
                required
                inputProps={{ min: 1, max: 6 }}
                helperText="Academic year (1-6)"
              />
            </Grid>

            {/* Course Assignments */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Course Enrollments
              </Typography>
              <Autocomplete
                multiple
                options={availableCourses}
                getOptionLabel={(option) => `${option.code} - ${option.name}`}
                value={availableCourses.filter(course => formData.courses.includes(course.id))}
                onChange={(_, newValue) => {
                  setFormData(prev => ({
                    ...prev,
                    courses: newValue.map(course => course.id),
                  }));
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={`${option.code} - ${option.name}`}
                      {...getTagProps({ index })}
                      key={option.id}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Select courses for this group"
                    helperText="Choose the courses that this student group will attend"
                  />
                )}
              />
            </Grid>

            {/* Summary Information */}
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Group Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Students:</strong> {formData.size} students
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Department:</strong> {formData.department || 'Not specified'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Year Level:</strong> Year {formData.yearLevel}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Enrolled Courses:</strong> {formData.courses.length} courses
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {studentGroup ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};