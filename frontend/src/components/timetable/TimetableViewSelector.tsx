import React from 'react';
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Typography,
  Paper,
} from '@mui/material';
import {
  ViewWeek as WeekIcon,
  CalendarMonth as MonthIcon,
  School as SemesterIcon,
  Person as PersonIcon,
  Room as RoomIcon,
  Group as GroupIcon,
} from '@mui/icons-material';

export type ViewType = 'week' | 'month' | 'semester';
export type ViewMode = 'lecturer' | 'venue' | 'student-group' | 'master';

interface TimetableViewSelectorProps {
  viewType: ViewType;
  viewMode: ViewMode;
  onViewTypeChange: (viewType: ViewType) => void;
  onViewModeChange: (viewMode: ViewMode) => void;
  selectedEntity?: string;
  onEntityChange?: (entityId: string) => void;
  availableEntities?: Array<{ id: string; name: string }>;
}

export const TimetableViewSelector: React.FC<TimetableViewSelectorProps> = ({
  viewType,
  viewMode,
  onViewTypeChange,
  onViewModeChange,
  selectedEntity,
  onEntityChange,
  availableEntities = [],
}) => {
  const handleViewTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewType: ViewType | null,
  ) => {
    if (newViewType !== null) {
      onViewTypeChange(newViewType);
    }
  };

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: ViewMode | null,
  ) => {
    if (newViewMode !== null) {
      onViewModeChange(newViewMode);
    }
  };

  const handleEntityChange = (event: SelectChangeEvent<string>) => {
    if (onEntityChange) {
      onEntityChange(event.target.value);
    }
  };

  const getViewModeLabel = (mode: ViewMode) => {
    switch (mode) {
      case 'lecturer':
        return 'Lecturer View';
      case 'venue':
        return 'Venue View';
      case 'student-group':
        return 'Student Group View';
      case 'master':
        return 'Master Timetable';
      default:
        return 'Unknown View';
    }
  };

  const getViewModeIcon = (mode: ViewMode) => {
    switch (mode) {
      case 'lecturer':
        return <PersonIcon />;
      case 'venue':
        return <RoomIcon />;
      case 'student-group':
        return <GroupIcon />;
      case 'master':
        return <MonthIcon />;
      default:
        return null;
    }
  };

  const showEntitySelector = viewMode !== 'master' && availableEntities.length > 0;

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">
          Timetable View Options
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          {/* View Type Selector */}
          <Box>
            <Typography variant="body2" gutterBottom>
              Time Period
            </Typography>
            <ToggleButtonGroup
              value={viewType}
              exclusive
              onChange={handleViewTypeChange}
              size="small"
            >
              <ToggleButton value="week">
                <WeekIcon sx={{ mr: 1 }} />
                Week
              </ToggleButton>
              <ToggleButton value="month">
                <MonthIcon sx={{ mr: 1 }} />
                Month
              </ToggleButton>
              <ToggleButton value="semester">
                <SemesterIcon sx={{ mr: 1 }} />
                Semester
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* View Mode Selector */}
          <Box>
            <Typography variant="body2" gutterBottom>
              View Mode
            </Typography>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
            >
              <ToggleButton value="master">
                <MonthIcon sx={{ mr: 1 }} />
                Master
              </ToggleButton>
              <ToggleButton value="lecturer">
                <PersonIcon sx={{ mr: 1 }} />
                Lecturer
              </ToggleButton>
              <ToggleButton value="venue">
                <RoomIcon sx={{ mr: 1 }} />
                Venue
              </ToggleButton>
              <ToggleButton value="student-group">
                <GroupIcon sx={{ mr: 1 }} />
                Group
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Entity Selector */}
          {showEntitySelector && (
            <Box sx={{ minWidth: 200 }}>
              <FormControl fullWidth size="small">
                <InputLabel>{getViewModeLabel(viewMode)}</InputLabel>
                <Select
                  value={selectedEntity || ''}
                  onChange={handleEntityChange}
                  label={getViewModeLabel(viewMode)}
                >
                  {availableEntities.map((entity) => (
                    <MenuItem key={entity.id} value={entity.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getViewModeIcon(viewMode)}
                        {entity.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>

        {/* View Description */}
        <Typography variant="body2" color="text.secondary">
          {viewMode === 'master' && 'Showing complete timetable with all sessions'}
          {viewMode === 'lecturer' && selectedEntity && `Showing schedule for selected lecturer`}
          {viewMode === 'venue' && selectedEntity && `Showing bookings for selected venue`}
          {viewMode === 'student-group' && selectedEntity && `Showing classes for selected student group`}
          {viewMode !== 'master' && !selectedEntity && `Select a ${viewMode.replace('-', ' ')} to view their schedule`}
        </Typography>
      </Box>
    </Paper>
  );
};