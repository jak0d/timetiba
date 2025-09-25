import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { ClashVisualization } from '../ClashVisualization';
import { Clash } from '../../../types/entities';

const theme = createTheme();

const mockClashes: Clash[] = [
  {
    id: 'clash-1',
    type: 'venue_double_booking' as any,
    severity: 'critical' as any,
    affectedEntities: ['session-1', 'session-2'],
    description: 'Room A is double-booked on Monday at 9:00 AM',
    suggestedResolutions: [
      {
        id: 'resolution-1',
        description: 'Move session to Room B',
        impact: 'Minimal impact',
        confidence: 0.9,
        changes: [],
      },
    ],
  },
  {
    id: 'clash-2',
    type: 'lecturer_conflict' as any,
    severity: 'high' as any,
    affectedEntities: ['session-3'],
    description: 'Lecturer has conflicting appointments',
    suggestedResolutions: [
      {
        id: 'resolution-2',
        description: 'Reschedule to different time',
        impact: 'Moderate impact',
        confidence: 0.7,
        changes: [],
      },
    ],
  },
  {
    id: 'clash-3',
    type: 'student_group_overlap' as any,
    severity: 'medium' as any,
    affectedEntities: ['session-4'],
    description: 'Student group has overlapping classes',
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

describe('ClashVisualization', () => {
  it('renders no clashes message when clashes array is empty', () => {
    renderWithTheme(
      <ClashVisualization clashes={[]} />
    );

    expect(screen.getByText('No Clashes Detected')).toBeInTheDocument();
    expect(screen.getByText('The current timetable has no scheduling conflicts.')).toBeInTheDocument();
  });

  it('renders clash count in header', () => {
    renderWithTheme(
      <ClashVisualization clashes={mockClashes} />
    );

    expect(screen.getByText('Scheduling Clashes (3)')).toBeInTheDocument();
  });

  it('groups clashes by severity', () => {
    renderWithTheme(
      <ClashVisualization clashes={mockClashes} />
    );

    expect(screen.getByText('Critical Priority (1)')).toBeInTheDocument();
    expect(screen.getByText('High Priority (1)')).toBeInTheDocument();
    expect(screen.getByText('Medium Priority (1)')).toBeInTheDocument();
  });

  it('displays clash type labels correctly', () => {
    renderWithTheme(
      <ClashVisualization clashes={mockClashes} />
    );

    expect(screen.getByText('Venue Double Booking')).toBeInTheDocument();
    expect(screen.getByText('Lecturer Conflict')).toBeInTheDocument();
    expect(screen.getByText('Student Group Overlap')).toBeInTheDocument();
  });

  it('shows affected entities count', () => {
    renderWithTheme(
      <ClashVisualization clashes={mockClashes} />
    );

    expect(screen.getByText('2 entities')).toBeInTheDocument();
    expect(screen.getAllByText('1 entities')).toHaveLength(2); // Two clashes have 1 entity each
  });

  it('displays clash descriptions', () => {
    renderWithTheme(
      <ClashVisualization clashes={mockClashes} />
    );

    expect(screen.getByText('Room A is double-booked on Monday at 9:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Lecturer has conflicting appointments')).toBeInTheDocument();
    expect(screen.getByText('Student group has overlapping classes')).toBeInTheDocument();
  });

  it('expands clash details when clicked', () => {
    renderWithTheme(
      <ClashVisualization clashes={[mockClashes[0]]} />
    );

    // Initially, resolution details should not be visible
    expect(screen.queryByText('Move session to Room B')).not.toBeInTheDocument();

    // Click to expand the first clash
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    // Resolution details should now be visible
    expect(screen.getByText('Suggested Resolutions:')).toBeInTheDocument();
    expect(screen.getByText('Move session to Room B')).toBeInTheDocument();
    expect(screen.getByText('90% confidence')).toBeInTheDocument();
  });

  it('shows affected entities when expanded', () => {
    renderWithTheme(
      <ClashVisualization clashes={[mockClashes[0]]} />
    );

    // Click to expand the first clash
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    expect(screen.getByText('Affected Entities:')).toBeInTheDocument();
    expect(screen.getByText('session-1')).toBeInTheDocument();
    expect(screen.getByText('session-2')).toBeInTheDocument();
  });

  it('calls onClashClick when clash is clicked', () => {
    const mockOnClashClick = jest.fn();
    
    renderWithTheme(
      <ClashVisualization 
        clashes={[mockClashes[0]]} 
        onClashClick={mockOnClashClick}
      />
    );

    // Click on the clash item
    const clashItem = screen.getByText('Room A is double-booked on Monday at 9:00 AM');
    fireEvent.click(clashItem);

    expect(mockOnClashClick).toHaveBeenCalledWith(mockClashes[0]);
  });

  it('hides resolutions when showResolutions is false', () => {
    renderWithTheme(
      <ClashVisualization 
        clashes={mockClashes} 
        showResolutions={false}
      />
    );

    // Click to expand the first clash
    const expandButton = screen.getAllByRole('button')[0];
    fireEvent.click(expandButton);

    // Resolutions should not be shown
    expect(screen.queryByText('Suggested Resolutions:')).not.toBeInTheDocument();
    expect(screen.queryByText('Move session to Room B')).not.toBeInTheDocument();
  });

  it('handles clashes with no resolutions', () => {
    renderWithTheme(
      <ClashVisualization clashes={[mockClashes[2]]} />
    );

    // Click to expand the clash
    const expandButton = screen.getAllByRole('button')[0];
    fireEvent.click(expandButton);

    // Should show affected entities but no resolutions section
    expect(screen.getByText('Affected Entities:')).toBeInTheDocument();
    expect(screen.queryByText('Suggested Resolutions:')).not.toBeInTheDocument();
  });

  it('displays confidence levels with appropriate colors', () => {
    renderWithTheme(
      <ClashVisualization clashes={mockClashes} />
    );

    // Expand first clash to see high confidence resolution
    const expandButtons = screen.getAllByRole('button');
    fireEvent.click(expandButtons[0]);

    expect(screen.getByText('90% confidence')).toBeInTheDocument();

    // Expand second clash to see medium confidence resolution
    fireEvent.click(expandButtons[1]);

    expect(screen.getByText('70% confidence')).toBeInTheDocument();
  });
});