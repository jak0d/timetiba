import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Paper,
  Chip,
  IconButton,
  Alert,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { Lecturer, WeeklyAvailability, TimeSlot } from '../../types/entities';

interface LecturerAvailabilityProps {
  open: boolean;
  lecturer: Lecturer | null;
  onClose: () => void;
  onSave: (lecturerId: string, availability: WeeklyAvailability) => void;
}

export const LecturerAvailability: React.FC<LecturerAvailabilityProps> = ({
  open,
  lecturer,
  onClose,
  onSave,
}) => {
  const [availability, setAvailability] = useState<WeeklyAvailability>({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  });

  useEffect(() => {
    if (lecturer) {
      setAvailability(lecturer.availability);
    }
  }, [lecturer]);

  const handleSave = () => {
    if (lecturer) {
      onSave(lecturer.id, availability);
      onClose();
    }
  };

  const addTimeSlot = (day: keyof WeeklyAvailability) => {
    const newSlot: TimeSlot = { startTime: '09:00', endTime: '10:00' };
    setAvailability(prev => ({
      ...prev,
      [day]: [...prev[day], newSlot],
    }));
  };

  const removeTimeSlot = (day: keyof WeeklyAvailability, index: number) => {
    setAvailability(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  };

  const updateTimeSlot = (
    day: keyof WeeklyAvailability,
    index: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setAvailability(prev => ({
      ...prev,
      [day]: prev[day].map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      ),
    }));
  };

  const formatTimeSlot = (slot: TimeSlot) => {
    return `${slot.startTime} - ${slot.endTime}`;
  };

  const getDayDisplayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  const getTotalHours = () => {
    let totalMinutes = 0;
    Object.values(availability).forEach(daySlots => {
      daySlots.forEach(slot => {
        const start = new Date(`2000-01-01T${slot.startTime}:00`);
        const end = new Date(`2000-01-01T${slot.endTime}:00`);
        totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
      });
    });
    return Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal place
  };

  if (!lecturer) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Manage Availability - {lecturer.name}
          </Typography>
          <Chip
            label={`Total: ${getTotalHours()} hours/week`}
            color="primary"
            variant="outlined"
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          Set the time slots when {lecturer.name} is available to teach. 
          Maximum allowed: {lecturer.maxHoursPerWeek} hours per week.
        </Alert>

        <Grid container spacing={2}>
          {Object.entries(availability).map(([day, slots]) => (
            <Grid item xs={12} md={6} lg={4} key={day}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    {getDayDisplayName(day)}
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => addTimeSlot(day as keyof WeeklyAvailability)}
                    variant="outlined"
                  >
                    Add
                  </Button>
                </Box>

                {slots.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No availability set
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {slots.map((slot, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          backgroundColor: 'background.paper',
                        }}
                      >
                        <Typography variant="body2">
                          {formatTimeSlot(slot)}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeTimeSlot(day as keyof WeeklyAvailability, index)}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>

        {getTotalHours() > lecturer.maxHoursPerWeek && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Total availability ({getTotalHours()} hours) exceeds the maximum allowed 
            hours per week ({lecturer.maxHoursPerWeek} hours).
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={getTotalHours() > lecturer.maxHoursPerWeek}
        >
          Save Availability
        </Button>
      </DialogActions>
    </Dialog>
  );
};