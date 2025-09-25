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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Paper,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { Course, Frequency, Equipment, EquipmentType, CourseConstraint, ConstraintType, Priority } from '../../types/entities';

interface CourseFormProps {
  open: boolean;
  course?: Course;
  onClose: () => void;
  onSubmit: (course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) => void;
  availableLecturers?: { id: string; name: string }[];
  availableStudentGroups?: { id: string; name: string }[];
}

export const CourseForm: React.FC<CourseFormProps> = ({
  open,
  course,
  onClose,
  onSubmit,
  availableLecturers = [],
  availableStudentGroups = [],
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    duration: 60,
    frequency: Frequency.WEEKLY,
    lecturerId: '',
    studentGroups: [] as string[],
    requiredEquipment: [] as Equipment[],
    constraints: [] as CourseConstraint[],
  });

  const [newEquipment, setNewEquipment] = useState({
    name: '',
    type: EquipmentType.PROJECTOR,
    description: '',
  });

  const [newConstraint, setNewConstraint] = useState({
    type: ConstraintType.LECTURER_PREFERENCE,
    description: '',
    priority: Priority.MEDIUM,
  });

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name,
        code: course.code,
        duration: course.duration,
        frequency: course.frequency,
        lecturerId: course.lecturerId,
        studentGroups: course.studentGroups,
        requiredEquipment: course.requiredEquipment,
        constraints: course.constraints,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        duration: 60,
        frequency: Frequency.WEEKLY,
        lecturerId: '',
        studentGroups: [],
        requiredEquipment: [],
        constraints: [],
      });
    }
  }, [course, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const handleAddEquipment = () => {
    if (newEquipment.name.trim()) {
      const equipment: Equipment = {
        id: Date.now().toString(),
        name: newEquipment.name,
        type: newEquipment.type,
        description: newEquipment.description || undefined,
      };
      setFormData(prev => ({
        ...prev,
        requiredEquipment: [...prev.requiredEquipment, equipment],
      }));
      setNewEquipment({
        name: '',
        type: EquipmentType.PROJECTOR,
        description: '',
      });
    }
  };

  const handleRemoveEquipment = (equipmentId: string) => {
    setFormData(prev => ({
      ...prev,
      requiredEquipment: prev.requiredEquipment.filter(eq => eq.id !== equipmentId),
    }));
  };

  const handleAddConstraint = () => {
    if (newConstraint.description.trim()) {
      const constraint: CourseConstraint = {
        id: Date.now().toString(),
        type: newConstraint.type,
        description: newConstraint.description,
        priority: newConstraint.priority,
      };
      setFormData(prev => ({
        ...prev,
        constraints: [...prev.constraints, constraint],
      }));
      setNewConstraint({
        type: ConstraintType.LECTURER_PREFERENCE,
        description: '',
        priority: Priority.MEDIUM,
      });
    }
  };

  const handleRemoveConstraint = (constraintId: string) => {
    setFormData(prev => ({
      ...prev,
      constraints: prev.constraints.filter(c => c.id !== constraintId),
    }));
  };

  const formatConstraintType = (type: ConstraintType) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatPriority = (priority: Priority) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {course ? 'Edit Course' : 'Add New Course'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Course Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Course Code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Duration (minutes)"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                required
                inputProps={{ min: 15, max: 480 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth required>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={formData.frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as Frequency }))}
                  label="Frequency"
                >
                  {Object.values(Frequency).map(freq => (
                    <MenuItem key={freq} value={freq}>
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth required>
                <InputLabel>Lecturer</InputLabel>
                <Select
                  value={formData.lecturerId}
                  onChange={(e) => setFormData(prev => ({ ...prev, lecturerId: e.target.value }))}
                  label="Lecturer"
                >
                  {availableLecturers.map(lecturer => (
                    <MenuItem key={lecturer.id} value={lecturer.id}>
                      {lecturer.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Student Groups */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Student Groups
              </Typography>
              <Autocomplete
                multiple
                options={availableStudentGroups}
                getOptionLabel={(option) => option.name}
                value={availableStudentGroups.filter(group => formData.studentGroups.includes(group.id))}
                onChange={(_, newValue) => {
                  setFormData(prev => ({
                    ...prev,
                    studentGroups: newValue.map(group => group.id),
                  }));
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option.name}
                      {...getTagProps({ index })}
                      key={option.id}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Select student groups"
                    helperText="Select the student groups that will attend this course"
                  />
                )}
              />
            </Grid>

            {/* Required Equipment */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Required Equipment
              </Typography>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Equipment Name"
                      value={newEquipment.name}
                      onChange={(e) => setNewEquipment(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={newEquipment.type}
                        onChange={(e) => setNewEquipment(prev => ({ ...prev, type: e.target.value as EquipmentType }))}
                        label="Type"
                      >
                        {Object.values(EquipmentType).map(type => (
                          <MenuItem key={type} value={type}>
                            {formatConstraintType(type as any)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={newEquipment.description}
                      onChange={(e) => setNewEquipment(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Button
                      variant="outlined"
                      onClick={handleAddEquipment}
                      disabled={!newEquipment.name.trim()}
                      startIcon={<Add />}
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.requiredEquipment.map((equipment) => (
                  <Chip
                    key={equipment.id}
                    label={`${equipment.name} (${formatConstraintType(equipment.type as any)})`}
                    onDelete={() => handleRemoveEquipment(equipment.id)}
                    variant="outlined"
                    color="primary"
                  />
                ))}
              </Box>
            </Grid>

            {/* Constraints */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Course Constraints
              </Typography>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>Constraint Type</InputLabel>
                      <Select
                        value={newConstraint.type}
                        onChange={(e) => setNewConstraint(prev => ({ ...prev, type: e.target.value as ConstraintType }))}
                        label="Constraint Type"
                      >
                        {Object.values(ConstraintType).map(type => (
                          <MenuItem key={type} value={type}>
                            {formatConstraintType(type)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={newConstraint.description}
                      onChange={(e) => setNewConstraint(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Select
                        value={newConstraint.priority}
                        onChange={(e) => setNewConstraint(prev => ({ ...prev, priority: e.target.value as Priority }))}
                        label="Priority"
                      >
                        {Object.values(Priority).map(priority => (
                          <MenuItem key={priority} value={priority}>
                            {formatPriority(priority)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Button
                      variant="outlined"
                      onClick={handleAddConstraint}
                      disabled={!newConstraint.description.trim()}
                      startIcon={<Add />}
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {formData.constraints.map((constraint) => (
                  <Paper key={constraint.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle2">
                        {formatConstraintType(constraint.type)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {constraint.description}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={formatPriority(constraint.priority)}
                        size="small"
                        color={constraint.priority === Priority.CRITICAL ? 'error' : 
                               constraint.priority === Priority.HIGH ? 'warning' : 'default'}
                      />
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleRemoveConstraint(constraint.id)}
                        startIcon={<Delete />}
                      >
                        Remove
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {course ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};