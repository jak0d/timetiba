import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { TimetableGrid } from '../TimetableGrid';
import { Schedule, ScheduledSession, DayOfWeek, Clash } from '../../../types/entities';

const theme = createTheme();

const mockSchedule: Schedule = {
  id: '1',
  name: 'Test Schedule',
  academicPeriod: 'Fall 2024',
  status: 'draft' as any,
  createdAt: new Date(),
  lastModified: new Date(),
  timeSlots: [
    {
      id: 'session-1',
      courseId: 'CS101',
      lecturerId: 'lecturer-1',
      venueId: 'venue-1',
      studentGroups: ['group-1'],
      startTime: new Date('2024-01-15T09:00:00'),
      endTime: new Date('2024-01-15T10:30:00'),
      dayOfWeek: DayOfWeek.MONDAY,
    },
    {
      id: 'session-2',
      courseId: 'MATH201',
      lecturerId: 'lecturer-2',
      venueId: 'venue-2',
      studentGroups: ['group-2'],
      startTime: new Date('2024-01-15T10:00:00'),
      endTime: new Date('2024-01-15T11:30:00'),
      dayOfWeek: DayOfWeek.TUESDAY,
    },
  ],
};

const mockClashes: Clash[] = [
  {
    id: 'clash-1',
    type: 'venue_double_booking' as any,
    severity: 'high' as any,
    affectedEntities: ['session-1'],
    description: 'Venue conflict detected',
    suggestedResolutions: [],
  },
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('TimetableGrid', () => {
  it('renders the timetable grid with days and time slots', () => {
    renderWithTheme(
      <TimetableGrid schedule={mockSchedule} />
    );

    // Check that day headers are rendered
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Tuesday')).toBeInTheDocument();
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
    expect(screen.getByText('Thursday')).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();
    expect(screen.getByText('Saturday')).toBeInTheDocument();
    expect(screen.getByText('Sunday')).toBeInTheDocument();

    // Check that time slots are rendered
    expect(screen.getByText('7:00 AM')).toBeInTheDocument();
    expect(screen.getByText('8:00 AM')).toBeInTheDocument();
    expect(screen.getByText('9:00 AM')).toBeInTheDocument();
    expect(screen.getByText('10:00 PM')).toBeInTheDocument();
  });

  it('renders scheduled sessions in correct time slots', () => {
    renderWithTheme(
      <TimetableGrid schedule={mockSchedule} />
    );

    // Check that sessions are rendered
    expect(screen.getByText('CS101')).toBeInTheDocument();
    expect(screen.getByText('MATH201')).toBeInTheDocument();
    expect(screen.getByText('venue-1')).toBeInTheDocument();
    expect(screen.getByText('venue-2')).toBeInTheDocument();
  });

  it('highlights sessions with clashes', () => {
    renderWithTheme(
      <TimetableGrid 
        schedule={mockSchedule} 
        clashes={mockClashes}
      />
    );

    // Check that clash indicator is shown
    expect(screen.getByText('1 clash')).toBeInTheDocument();
  });

  it('calls onSessionClick when a session is clicked', () => {
    const mockOnSessionClick = jest.fn();
    
    renderWithTheme(
      <TimetableGrid 
        schedule={mockSchedule} 
        onSessionClick={mockOnSessionClick}
      />
    );

    // Click on a session
    fireEvent.click(screen.getByText('CS101'));
    
    expect(mockOnSessionClick).toHaveBeenCalledWith(mockSchedule.timeSlots[0]);
  });

  it('shows session details in tooltip on hover', async () => {
    renderWithTheme(
      <TimetableGrid schedule={mockSchedule} />
    );

    // Hover over a session
    fireEvent.mouseEnter(screen.getByText('CS101'));
    
    // Check tooltip content appears
    expect(await screen.findByText('Course: CS101')).toBeInTheDocument();
    expect(await screen.findByText('Lecturer: lecturer-1')).toBeInTheDocument();
    expect(await screen.findByText('Venue: venue-1')).toBeInTheDocument();
  });

  it('renders empty slots when no sessions are scheduled', () => {
    const emptySchedule: Schedule = {
      ...mockSchedule,
      timeSlots: [],
    };

    renderWithTheme(
      <TimetableGrid schedule={emptySchedule} />
    );

    // Grid should still render with empty slots
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('7:00 AM')).toBeInTheDocument();
    
    // No sessions should be visible
    expect(screen.queryByText('CS101')).not.toBeInTheDocument();
  });

  it('handles multiple sessions in the same time slot', () => {
    const scheduleWithMultipleSessions: Schedule = {
      ...mockSchedule,
      timeSlots: [
        ...mockSchedule.timeSlots,
        {
          id: 'session-3',
          courseId: 'PHY301',
          lecturerId: 'lecturer-3',
          venueId: 'venue-3',
          studentGroups: ['group-3'],
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          dayOfWeek: DayOfWeek.MONDAY,
        },
      ],
    };

    renderWithTheme(
      <TimetableGrid schedule={scheduleWithMultipleSessions} />
    );

    // Both sessions in the same time slot should be visible
    expect(screen.getByText('CS101')).toBeInTheDocument();
    expect(screen.getByText('PHY301')).toBeInTheDocument();
  });
});