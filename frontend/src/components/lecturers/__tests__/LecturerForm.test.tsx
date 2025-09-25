import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LecturerForm } from '../LecturerForm';
import { Lecturer } from '../../../types/entities';

const mockLecturer: Lecturer = {
  id: '1',
  name: 'Dr. Test',
  email: 'test@university.edu',
  department: 'Computer Science',
  subjects: ['Programming', 'Algorithms'],
  maxHoursPerDay: 8,
  maxHoursPerWeek: 40,
  availability: {
    monday: [{ startTime: '09:00', endTime: '12:00' }],
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
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('LecturerForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form for new lecturer', () => {
    render(
      <LecturerForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('Add New Lecturer')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Department/)).toBeInTheDocument();
  });

  it('renders form for editing lecturer', () => {
    render(
      <LecturerForm
        open={true}
        lecturer={mockLecturer}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('Edit Lecturer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Dr. Test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@university.edu')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Computer Science')).toBeInTheDocument();
  });

  it('handles subject addition', async () => {
    const user = userEvent.setup();
    
    render(
      <LecturerForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const subjectInput = screen.getByLabelText('Add Subject');
    await user.type(subjectInput, 'Mathematics');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Mathematics')).toBeInTheDocument();
  });

  it('navigates between tabs', async () => {
    const user = userEvent.setup();
    
    render(
      <LecturerForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    await user.click(screen.getByRole('tab', { name: 'Availability' }));
    expect(screen.getByText('Monday')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Preferences' }));
    expect(screen.getByLabelText('Max Consecutive Hours')).toBeInTheDocument();
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    
    render(
      <LecturerForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    await user.type(screen.getByLabelText(/Full Name/), 'New Lecturer');
    await user.type(screen.getByLabelText(/Email/), 'new@university.edu');
    await user.type(screen.getByLabelText(/Department/), 'Mathematics');

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Lecturer',
          email: 'new@university.edu',
          department: 'Mathematics',
        })
      );
    });
  });
});