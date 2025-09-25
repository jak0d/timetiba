import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { TimetableViewSelector, ViewType, ViewMode } from '../TimetableViewSelector';

const theme = createTheme();

const mockEntities = [
  { id: 'entity-1', name: 'Entity One' },
  { id: 'entity-2', name: 'Entity Two' },
  { id: 'entity-3', name: 'Entity Three' },
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('TimetableViewSelector', () => {
  const defaultProps = {
    viewType: 'week' as ViewType,
    viewMode: 'master' as ViewMode,
    onViewTypeChange: jest.fn(),
    onViewModeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders view type toggle buttons', () => {
    renderWithTheme(
      <TimetableViewSelector {...defaultProps} />
    );

    expect(screen.getByText('Week')).toBeInTheDocument();
    expect(screen.getByText('Month')).toBeInTheDocument();
    expect(screen.getByText('Semester')).toBeInTheDocument();
  });

  it('renders view mode toggle buttons', () => {
    renderWithTheme(
      <TimetableViewSelector {...defaultProps} />
    );

    expect(screen.getByText('Master')).toBeInTheDocument();
    expect(screen.getByText('Lecturer')).toBeInTheDocument();
    expect(screen.getByText('Venue')).toBeInTheDocument();
    expect(screen.getByText('Group')).toBeInTheDocument();
  });

  it('highlights selected view type', () => {
    renderWithTheme(
      <TimetableViewSelector {...defaultProps} viewType="month" />
    );

    const monthButton = screen.getByRole('button', { name: /month/i });
    expect(monthButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('highlights selected view mode', () => {
    renderWithTheme(
      <TimetableViewSelector {...defaultProps} viewMode="lecturer" />
    );

    const lecturerButton = screen.getByRole('button', { name: /lecturer/i });
    expect(lecturerButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onViewTypeChange when view type is changed', () => {
    const mockOnViewTypeChange = jest.fn();
    
    renderWithTheme(
      <TimetableViewSelector 
        {...defaultProps} 
        onViewTypeChange={mockOnViewTypeChange}
      />
    );

    fireEvent.click(screen.getByText('Month'));
    expect(mockOnViewTypeChange).toHaveBeenCalledWith('month');
  });

  it('calls onViewModeChange when view mode is changed', () => {
    const mockOnViewModeChange = jest.fn();
    
    renderWithTheme(
      <TimetableViewSelector 
        {...defaultProps} 
        onViewModeChange={mockOnViewModeChange}
      />
    );

    fireEvent.click(screen.getByText('Lecturer'));
    expect(mockOnViewModeChange).toHaveBeenCalledWith('lecturer');
  });

  it('shows entity selector when view mode is not master and entities are available', () => {
    renderWithTheme(
      <TimetableViewSelector 
        {...defaultProps} 
        viewMode="lecturer"
        availableEntities={mockEntities}
      />
    );

    expect(screen.getByLabelText('Lecturer View')).toBeInTheDocument();
  });

  it('hides entity selector when view mode is master', () => {
    renderWithTheme(
      <TimetableViewSelector 
        {...defaultProps} 
        viewMode="master"
        availableEntities={mockEntities}
      />
    );

    expect(screen.queryByLabelText('Lecturer View')).not.toBeInTheDocument();
  });

  it('hides entity selector when no entities are available', () => {
    renderWithTheme(
      <TimetableViewSelector 
        {...defaultProps} 
        viewMode="lecturer"
        availableEntities={[]}
      />
    );

    expect(screen.queryByLabelText('Lecturer View')).not.toBeInTheDocument();
  });

  it('displays correct entity selector label based on view mode', () => {
    const { rerender } = renderWithTheme(
      <TimetableViewSelector 
        {...defaultProps} 
        viewMode="lecturer"
        availableEntities={mockEntities}
      />
    );

    expect(screen.getByLabelText('Lecturer View')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <TimetableViewSelector 
          {...defaultProps} 
          viewMode="venue"
          availableEntities={mockEntities}
        />
      </ThemeProvider>
    );

    expect(screen.getByLabelText('Venue View')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <TimetableViewSelector 
          {...defaultProps} 
          viewMode="student-group"
          availableEntities={mockEntities}
        />
      </ThemeProvider>
    );

    expect(screen.getByLabelText('Student Group View')).toBeInTheDocument();
  });

  it('calls onEntityChange when entity is selected', () => {
    const mockOnEntityChange = jest.fn();
    
    renderWithTheme(
      <TimetableViewSelector 
        {...defaultProps} 
        viewMode="lecturer"
        availableEntities={mockEntities}
        onEntityChange={mockOnEntityChange}
      />
    );

    // Open the select dropdown
    fireEvent.mouseDown(screen.getByLabelText('Lecturer View'));
    
    // Select an entity
    fireEvent.click(screen.getByText('Entity One'));
    
    expect(mockOnEntityChange).toHaveBeenCalledWith('entity-1');
  });

  it('displays selected entity in the dropdown', () => {
    renderWithTheme(
      <TimetableViewSelector 
        {...defaultProps} 
        viewMode="lecturer"
        availableEntities={mockEntities}
        selectedEntity="entity-2"
      />
    );

    expect(screen.getByText('Entity Two')).toBeInTheDocument();
  });

  it('shows appropriate description text for each view mode', () => {
    const { rerender } = renderWithTheme(
      <TimetableViewSelector {...defaultProps} viewMode="master" />
    );

    expect(screen.getByText('Showing complete timetable with all sessions')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <TimetableViewSelector 
          {...defaultProps} 
          viewMode="lecturer"
          selectedEntity="lecturer-1"
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Showing schedule for selected lecturer')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <TimetableViewSelector 
          {...defaultProps} 
          viewMode="venue"
          selectedEntity="venue-1"
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Showing bookings for selected venue')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <TimetableViewSelector 
          {...defaultProps} 
          viewMode="student-group"
          selectedEntity="group-1"
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Showing classes for selected student group')).toBeInTheDocument();
  });

  it('shows selection prompt when entity view mode is selected but no entity is chosen', () => {
    renderWithTheme(
      <TimetableViewSelector 
        {...defaultProps} 
        viewMode="lecturer"
        availableEntities={mockEntities}
      />
    );

    expect(screen.getByText('Select a lecturer to view their schedule')).toBeInTheDocument();
  });
});