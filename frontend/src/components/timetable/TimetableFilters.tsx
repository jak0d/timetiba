import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  OutlinedInput,
  SelectChangeEvent,
  Typography,
  Paper,
  Grid,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

export interface TimetableFilters {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  departments: string[];
  lecturers: string[];
  venues: string[];
  studentGroups: string[];
  viewType: 'week' | 'month' | 'semester';
}

interface TimetableFiltersProps {
  filters: TimetableFilters;
  onFiltersChange: (filters: TimetableFilters) => void;
  availableOptions: {
    departments: string[];
    lecturers: Array<{ id: string; name: string }>;
    venues: Array<{ id: string; name: string }>;
    studentGroups: Array<{ id: string; name: string }>;
  };
}

export const TimetableFiltersComponent: React.FC<TimetableFiltersProps> = ({
  filters,
  onFiltersChange,
  availableOptions,
}) => {
  const handleDateChange = (field: 'start' | 'end') => (date: Date | null) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: date,
      },
    });
  };

  const handleMultiSelectChange = (field: keyof Pick<TimetableFilters, 'departments' | 'lecturers' | 'venues' | 'studentGroups'>) => 
    (event: SelectChangeEvent<string[]>) => {
      const value = event.target.value;
      onFiltersChange({
        ...filters,
        [field]: typeof value === 'string' ? value.split(',') : value,
      });
    };

  const handleViewTypeChange = (event: SelectChangeEvent<string>) => {
    onFiltersChange({
      ...filters,
      viewType: event.target.value as 'week' | 'month' | 'semester',
    });
  };

  const renderMultiSelect = (
    label: string,
    value: string[],
    options: Array<{ id: string; name: string }>,
    onChange: (event: SelectChangeEvent<string[]>) => void
  ) => (
    <FormControl fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={value}
        onChange={onChange}
        input={<OutlinedInput label={label} />}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((id) => {
              const option = options.find(opt => opt.id === id);
              return (
                <Chip
                  key={id}
                  label={option?.name || id}
                  size="small"
                />
              );
            })}
          </Box>
        )}
      >
        {options.map((option) => (
          <MenuItem key={option.id} value={option.id}>
            {option.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Filter Timetable
        </Typography>
        
        <Grid container spacing={2}>
          {/* Date Range */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <DatePicker
                label="Start Date"
                value={filters.dateRange.start}
                onChange={handleDateChange('start')}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
              <DatePicker
                label="End Date"
                value={filters.dateRange.end}
                onChange={handleDateChange('end')}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Box>
          </Grid>

          {/* View Type */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>View Type</InputLabel>
              <Select
                value={filters.viewType}
                onChange={handleViewTypeChange}
                label="View Type"
              >
                <MenuItem value="week">Week View</MenuItem>
                <MenuItem value="month">Month View</MenuItem>
                <MenuItem value="semester">Semester View</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Departments */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Departments</InputLabel>
              <Select
                multiple
                value={filters.departments}
                onChange={handleMultiSelectChange('departments')}
                input={<OutlinedInput label="Departments" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((dept) => (
                      <Chip key={dept} label={dept} size="small" />
                    ))}
                  </Box>
                )}
              >
                {availableOptions.departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Lecturers */}
          <Grid item xs={12} md={6}>
            {renderMultiSelect(
              'Lecturers',
              filters.lecturers,
              availableOptions.lecturers,
              handleMultiSelectChange('lecturers')
            )}
          </Grid>

          {/* Venues */}
          <Grid item xs={12} md={6}>
            {renderMultiSelect(
              'Venues',
              filters.venues,
              availableOptions.venues,
              handleMultiSelectChange('venues')
            )}
          </Grid>

          {/* Student Groups */}
          <Grid item xs={12} md={6}>
            {renderMultiSelect(
              'Student Groups',
              filters.studentGroups,
              availableOptions.studentGroups,
              handleMultiSelectChange('studentGroups')
            )}
          </Grid>
        </Grid>
      </Paper>
    </LocalizationProvider>
  );
};