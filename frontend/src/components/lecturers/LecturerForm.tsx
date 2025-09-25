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
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { Lecturer, WeeklyAvailability, TimeSlot, LecturerPreferences, DayOfWeek } from '../../types/entities';

interface LecturerFormProps {
  open: boolean;
  lecturer?: Lecturer;
  onClose: () => void;
  onSubmit: (lecturer: Omit<Lecturer, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

export const LecturerForm: React.FC<LecturerFormProps> = ({
  open,
  lecturer,
  onClose,
  onSubmit,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    subjects: [] as string[],
    maxHoursPerDay: 8,
    maxHoursPerWeek: 40,
    availability: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    } as WeeklyAvailability,
    preferences: {
      preferredTimeSlots: [],
      avoidTimeSlots: [],
      maxConsecutiveHours: 4,
      preferredBreakDuration: 15,
      preferredVenues: [],
    } as LecturerPreferences,
  });

  const [newSubject, setNewSubject] = useState('');

  useEffect(() => {
    if (lecturer) {
      setFormData({
        name: lecturer.name,
        email: lecturer.email,
        department: lecturer.department,
        subjects: lecturer.subjects,
        maxHoursPerDay: lecturer.maxHoursPerDay,
        maxHoursPerWeek: lecturer.maxHoursPerWeek,
        availability: lecturer.availability,
        preferences: lecturer.preferences,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        department: '',
        subjects: [],
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        availability: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        },
        preferences: {
          preferredTimeSlots: [],
          avoidTimeSlots: [],
          maxConsecutiveHours: 4,
          preferredBreakDuration: 15,
          preferredVenues: [],
        },
      });
    }
    setTabValue(0);
  }, [lecturer, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const handleAddSubject = () => {
    if (newSubject.trim() && !formData.subjects.includes(newSubject.trim())) {
      setFormData(prev => ({
        ...prev,
        subjects: [...prev.subjects, newSubject.trim()],
      }));
      setNewSubject('');
    }
  };

  const handleRemoveSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter(s => s !== subject),
    }));
  };

  const addTimeSlot = (day: keyof WeeklyAvailability) => {
    const newSlot: TimeSlot = { startTime: '09:00', endTime: '10:00' };
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: [...prev.availability[day], newSlot],
      },
    }));
  };

  const updateTimeSlot = (day: keyof WeeklyAvailability, index: number, field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: prev.availability[day].map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot
        ),
      },
    }));
  };

  const removeTimeSlot = (day: keyof WeeklyAvailability, index: number) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: prev.availability[day].filter((_, i) => i !== index),
      },
    }));
  };

  const renderAvailabilityTab = () => (
    <Grid container spacing={2}>
      {Object.entries(formData.availability).map(([day, slots]) => (
        <Grid item xs={12} key={day}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                {day}
              </Typography>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={() => addTimeSlot(day as keyof WeeklyAvailability)}
              >
                Add Time Slot
              </Button>
            </Box>
            {slots.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No availability set for {day}
              </Typography>
            ) : (
              <Grid container spacing={1}>
                {slots.map((slot, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        type="time"
                        size="small"
                        value={slot.startTime}
                        onChange={(e) => updateTimeSlot(day as keyof WeeklyAvailability, index, 'startTime', e.target.value)}
                      />
                      <Typography variant="body2">to</Typography>
                      <TextField
                        type="time"
                        size="small"
                        value={slot.endTime}
                        onChange={(e) => updateTimeSlot(day as keyof WeeklyAvailability, index, 'endTime', e.target.value)}
                      />
                      <Button
                        size="small"
                        color="error"
                        onClick={() => removeTimeSlot(day as keyof WeeklyAvailability, index)}
                      >
                        <Delete />
                      </Button>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {lecturer ? 'Edit Lecturer' : 'Add New Lecturer'}
        </DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Basic Information" />
            <Tab label="Availability" />
            <Tab label="Preferences" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Max Hours/Day"
                  type="number"
                  value={formData.maxHoursPerDay}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxHoursPerDay: parseInt(e.target.value) || 0 }))}
                  inputProps={{ min: 1, max: 24 }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Max Hours/Week"
                  type="number"
                  value={formData.maxHoursPerWeek}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxHoursPerWeek: parseInt(e.target.value) || 0 }))}
                  inputProps={{ min: 1, max: 168 }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Subjects
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    label="Add Subject"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubject())}
                  />
                  <Button variant="outlined" onClick={handleAddSubject}>
                    Add
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.subjects.map((subject) => (
                    <Chip
                      key={subject}
                      label={subject}
                      onDelete={() => handleRemoveSubject(subject)}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {renderAvailabilityTab()}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Max Consecutive Hours"
                  type="number"
                  value={formData.preferences.maxConsecutiveHours}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    preferences: {
                      ...prev.preferences,
                      maxConsecutiveHours: parseInt(e.target.value) || 0,
                    },
                  }))}
                  inputProps={{ min: 1, max: 12 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Preferred Break Duration (minutes)"
                  type="number"
                  value={formData.preferences.preferredBreakDuration}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    preferences: {
                      ...prev.preferences,
                      preferredBreakDuration: parseInt(e.target.value) || 0,
                    },
                  }))}
                  inputProps={{ min: 5, max: 120 }}
                />
              </Grid>
            </Grid>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {lecturer ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};