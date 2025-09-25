import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { TimetableGrid } from './TimetableGrid';
import { TimetableFilters, TimetableFiltersComponent } from './TimetableFilters';
import { ClashVisualization } from './ClashVisualization';
import { TimetableViewSelector, ViewType, ViewMode } from './TimetableViewSelector';
import { AIOptimizationPanel } from '../ai/AIOptimizationPanel';
import { 
  Schedule, 
  ScheduledSession, 
  Clash, 
  DayOfWeek,
  Lecturer,
  Venue,
  StudentGroup,
} from '../../types/entities';
import {
  OptimizationParameters,
  OptimizationResult,
} from '../../types/ai';

interface TimetableContainerProps {
  schedule?: Schedule;
  clashes?: Clash[];
  lecturers?: Lecturer[];
  venues?: Venue[];
  studentGroups?: StudentGroup[];
  loading?: boolean;
  onScheduleUpdate?: (schedule: Schedule) => void;
  onSessionMove?: (sessionId: string, newDay: DayOfWeek, newTime: string) => void;
  onGenerateSchedule?: () => void;
  onRefresh?: () => void;
  // AI Optimization props
  onStartOptimization?: (parameters: OptimizationParameters) => Promise<void>;
  onApplySuggestion?: (suggestionId: string) => Promise<void>;
  onRejectSuggestion?: (suggestionId: string) => Promise<void>;
  onCancelOptimization?: () => Promise<void>;
  optimizationResult?: OptimizationResult;
}

export const TimetableContainer: React.FC<TimetableContainerProps> = ({
  schedule,
  clashes = [],
  lecturers = [],
  venues = [],
  studentGroups = [],
  loading = false,
  onScheduleUpdate,
  onSessionMove,
  onGenerateSchedule,
  onRefresh,
  onStartOptimization,
  onApplySuggestion,
  onRejectSuggestion,
  onCancelOptimization,
  optimizationResult,
}) => {
  const [filters, setFilters] = useState<TimetableFilters>({
    dateRange: { start: null, end: null },
    departments: [],
    lecturers: [],
    venues: [],
    studentGroups: [],
    viewType: 'week',
  });

  const [viewType, setViewType] = useState<ViewType>('week');
  const [viewMode, setViewMode] = useState<ViewMode>('master');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<ScheduledSession | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  // Filter available options for dropdowns
  const availableOptions = useMemo(() => {
    const departments = Array.from(new Set([
      ...lecturers.map(l => l.department),
      ...studentGroups.map(sg => sg.department),
    ]));

    return {
      departments,
      lecturers: lecturers.map(l => ({ id: l.id, name: l.name })),
      venues: venues.map(v => ({ id: v.id, name: v.name })),
      studentGroups: studentGroups.map(sg => ({ id: sg.id, name: sg.name })),
    };
  }, [lecturers, venues, studentGroups]);

  // Get entities for view selector based on current view mode
  const viewSelectorEntities = useMemo(() => {
    switch (viewMode) {
      case 'lecturer':
        return availableOptions.lecturers;
      case 'venue':
        return availableOptions.venues;
      case 'student-group':
        return availableOptions.studentGroups;
      default:
        return [];
    }
  }, [viewMode, availableOptions]);

  // Filter schedule based on current filters and view mode
  const filteredSchedule = useMemo(() => {
    if (!schedule) return undefined;

    let filteredSessions = schedule.timeSlots;

    // Apply entity-specific filtering based on view mode
    if (viewMode !== 'master' && selectedEntity) {
      filteredSessions = filteredSessions.filter(session => {
        switch (viewMode) {
          case 'lecturer':
            return session.lecturerId === selectedEntity;
          case 'venue':
            return session.venueId === selectedEntity;
          case 'student-group':
            return session.studentGroups.includes(selectedEntity);
          default:
            return true;
        }
      });
    }

    // Apply additional filters
    if (filters.lecturers.length > 0) {
      filteredSessions = filteredSessions.filter(session =>
        filters.lecturers.includes(session.lecturerId)
      );
    }

    if (filters.venues.length > 0) {
      filteredSessions = filteredSessions.filter(session =>
        filters.venues.includes(session.venueId)
      );
    }

    if (filters.studentGroups.length > 0) {
      filteredSessions = filteredSessions.filter(session =>
        session.studentGroups.some(sg => filters.studentGroups.includes(sg))
      );
    }

    // Apply date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      filteredSessions = filteredSessions.filter(session => {
        const sessionDate = new Date(session.startTime);
        if (filters.dateRange.start && sessionDate < filters.dateRange.start) {
          return false;
        }
        if (filters.dateRange.end && sessionDate > filters.dateRange.end) {
          return false;
        }
        return true;
      });
    }

    return {
      ...schedule,
      timeSlots: filteredSessions,
    };
  }, [schedule, filters, viewMode, selectedEntity]);

  // Filter clashes based on filtered sessions
  const filteredClashes = useMemo(() => {
    if (!filteredSchedule) return [];
    
    const sessionIds = new Set(filteredSchedule.timeSlots.map(s => s.id));
    return clashes.filter(clash =>
      clash.affectedEntities.some(entityId => sessionIds.has(entityId))
    );
  }, [clashes, filteredSchedule]);

  const handleSessionClick = useCallback((session: ScheduledSession) => {
    setSelectedSession(session);
    setSessionDialogOpen(true);
  }, []);

  const handleCloseSessionDialog = useCallback(() => {
    setSessionDialogOpen(false);
    setSelectedSession(null);
  }, []);

  const handleClashClick = useCallback((clash: Clash) => {
    // Find the first affected session and highlight it
    const affectedSession = filteredSchedule?.timeSlots.find(session =>
      clash.affectedEntities.includes(session.id)
    );
    if (affectedSession) {
      handleSessionClick(affectedSession);
    }
  }, [filteredSchedule, handleSessionClick]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading timetable...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Timetable Visualization
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onGenerateSchedule && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onGenerateSchedule}
            >
              Generate Schedule
            </Button>
          )}
          {onRefresh && (
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={onRefresh}
            >
              Refresh
            </Button>
          )}
          {onScheduleUpdate && schedule && (
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={() => onScheduleUpdate(schedule)}
            >
              Save Changes
            </Button>
          )}
        </Box>
      </Box>

      {/* View Selector */}
      <TimetableViewSelector
        viewType={viewType}
        viewMode={viewMode}
        onViewTypeChange={setViewType}
        onViewModeChange={setViewMode}
        selectedEntity={selectedEntity}
        onEntityChange={setSelectedEntity}
        availableEntities={viewSelectorEntities}
      />

      {/* Filters */}
      <TimetableFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        availableOptions={availableOptions}
      />

      {/* AI Optimization Panel */}
      {(onStartOptimization || optimizationResult) && (
        <AIOptimizationPanel
          clashes={filteredClashes}
          onStartOptimization={onStartOptimization!}
          onApplySuggestion={onApplySuggestion!}
          onRejectSuggestion={onRejectSuggestion!}
          onCancelOptimization={onCancelOptimization}
          optimizationResult={optimizationResult}
          loading={loading}
        />
      )}

      {/* Main Content */}
      <Grid container spacing={2}>
        {/* Timetable Grid */}
        <Grid item xs={12} lg={8}>
          {filteredSchedule ? (
            <TimetableGrid
              schedule={filteredSchedule}
              clashes={filteredClashes}
              onSessionMove={onSessionMove}
              onSessionClick={handleSessionClick}
              readOnly={!onSessionMove}
            />
          ) : (
            <Alert severity="info">
              No timetable data available. Generate a schedule to get started.
            </Alert>
          )}
        </Grid>

        {/* Clash Visualization */}
        <Grid item xs={12} lg={4}>
          <ClashVisualization
            clashes={filteredClashes}
            onClashClick={handleClashClick}
            showResolutions={true}
          />
        </Grid>
      </Grid>

      {/* Session Details Dialog */}
      <Dialog
        open={sessionDialogOpen}
        onClose={handleCloseSessionDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Session Details</DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Course:</strong> {selectedSession.courseId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Lecturer:</strong> {selectedSession.lecturerId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Venue:</strong> {selectedSession.venueId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Day:</strong> {selectedSession.dayOfWeek}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Time:</strong> {new Date(selectedSession.startTime).toLocaleTimeString()} - {new Date(selectedSession.endTime).toLocaleTimeString()}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Student Groups:</strong> {selectedSession.studentGroups.join(', ')}
              </Typography>
              
              {/* Show clashes for this session */}
              {filteredClashes.some(clash => clash.affectedEntities.includes(selectedSession.id)) && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Clashes for this Session:
                  </Typography>
                  <ClashVisualization
                    clashes={filteredClashes.filter(clash => 
                      clash.affectedEntities.includes(selectedSession.id)
                    )}
                    showResolutions={true}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSessionDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};