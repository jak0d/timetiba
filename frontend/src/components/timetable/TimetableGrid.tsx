import React, { useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import { Schedule, ScheduledSession, DayOfWeek, Clash } from '../../types/entities';

interface TimetableGridProps {
  schedule: Schedule;
  clashes?: Clash[];
  onSessionMove?: (sessionId: string, newDay: DayOfWeek, newTime: string) => void;
  onSessionClick?: (session: ScheduledSession) => void;
  readOnly?: boolean;
}

interface TimeSlot {
  time: string;
  displayTime: string;
}

const DAYS: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
];

const TIME_SLOTS: TimeSlot[] = [
  { time: '08:00', displayTime: '8:00 AM' },
  { time: '09:00', displayTime: '9:00 AM' },
  { time: '10:00', displayTime: '10:00 AM' },
  { time: '11:00', displayTime: '11:00 AM' },
  { time: '12:00', displayTime: '12:00 PM' },
  { time: '13:00', displayTime: '1:00 PM' },
  { time: '14:00', displayTime: '2:00 PM' },
  { time: '15:00', displayTime: '3:00 PM' },
  { time: '16:00', displayTime: '4:00 PM' },
  { time: '17:00', displayTime: '5:00 PM' },
];

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  schedule,
  clashes = [],
  onSessionMove,
  onSessionClick,
  readOnly = false,
}) => {
  const theme = useTheme();

  const getSessionsForSlot = useCallback((day: DayOfWeek, time: string) => {
    return schedule.timeSlots.filter(session => {
      const sessionTime = new Date(session.startTime).toTimeString().slice(0, 5);
      return session.dayOfWeek === day && sessionTime === time;
    });
  }, [schedule.timeSlots]);

  const getClashesForSession = useCallback((sessionId: string) => {
    return clashes.filter(clash => 
      clash.affectedEntities.includes(sessionId)
    );
  }, [clashes]);

  const getSessionColor = (session: ScheduledSession) => {
    const sessionClashes = getClashesForSession(session.id);
    if (sessionClashes.length > 0) {
      const maxSeverity = Math.max(...sessionClashes.map(c => {
        switch (c.severity) {
          case 'critical': return 4;
          case 'high': return 3;
          case 'medium': return 2;
          case 'low': return 1;
          default: return 0;
        }
      }));
      
      switch (maxSeverity) {
        case 4: return theme.palette.error.main;
        case 3: return theme.palette.warning.main;
        case 2: return theme.palette.info.main;
        default: return theme.palette.success.main;
      }
    }
    return theme.palette.primary.main;
  };

  const renderSession = (session: ScheduledSession) => {
    const sessionClashes = getClashesForSession(session.id);
    const hasClashes = sessionClashes.length > 0;
    const color = getSessionColor(session);

    return (
      <Box
        key={session.id}
        onClick={() => onSessionClick?.(session)}
        sx={{
          mb: 0.5,
          p: 1,
          borderRadius: 1,
          backgroundColor: alpha(color, 0.1),
          border: `2px solid ${hasClashes ? color : 'transparent'}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(color, 0.2),
            transform: 'translateY(-1px)',
            boxShadow: theme.shadows[2],
          },
        }}
      >
        <Tooltip
          title={
            <Box>
              <Typography variant="body2" fontWeight="bold">
                Course: {session.courseId}
              </Typography>
              <Typography variant="body2">
                Lecturer: {session.lecturerId}
              </Typography>
              <Typography variant="body2">
                Venue: {session.venueId}
              </Typography>
              {hasClashes && (
                <Typography variant="body2" color="error">
                  {sessionClashes.length} clash(es) detected
                </Typography>
              )}
            </Box>
          }
        >
          <Box>
            <Typography variant="caption" fontWeight="bold" noWrap>
              {session.courseId}
            </Typography>
            <Typography variant="caption" display="block" noWrap>
              {session.venueId}
            </Typography>
            {hasClashes && (
              <Chip
                size="small"
                label={`${sessionClashes.length} clash${sessionClashes.length > 1 ? 'es' : ''}`}
                color="error"
                sx={{ mt: 0.5, height: 16, fontSize: '0.6rem' }}
              />
            )}
          </Box>
        </Tooltip>
      </Box>
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 2, overflow: 'auto' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '100px repeat(5, 1fr)', gap: 1, minWidth: 800 }}>
        {/* Header row */}
        <Box />
        {DAYS.map(day => (
          <Box key={day} sx={{ textAlign: 'center', p: 1, fontWeight: 'bold' }}>
            <Typography variant="h6" component="div">
              {day.charAt(0).toUpperCase() + day.slice(1)}
            </Typography>
          </Box>
        ))}

        {/* Time slots */}
        {TIME_SLOTS.map(timeSlot => (
          <React.Fragment key={timeSlot.time}>
            {/* Time label */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              p: 1,
              borderRight: `1px solid ${theme.palette.divider}`,
            }}>
              <Typography variant="body2" fontWeight="medium">
                {timeSlot.displayTime}
              </Typography>
            </Box>

            {/* Day columns */}
            {DAYS.map(day => {
              const sessions = getSessionsForSlot(day, timeSlot.time);

              return (
                <Box
                  key={`${day}-${timeSlot.time}`}
                  sx={{
                    minHeight: 80,
                    p: 0.5,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    backgroundColor: 'transparent',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  {sessions.map((session) => renderSession(session))}
                </Box>
              );
            })}
          </React.Fragment>
        ))}
      </Box>
    </Paper>
  );
};