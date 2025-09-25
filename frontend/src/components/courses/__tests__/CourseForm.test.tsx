import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourseForm } from '../CourseForm';
import { Course, Frequency } from '../../../types/entities';

const mockCourse: Course = {
  id: '1',
  name: 'Test Course',
  code: 'TEST101',
  duration: 90,
  frequency: Frequency.WEEKLY,
  lecturerId: '1',
  studentGroups: ['1', '2'],
  requiredEquipment: [],
  constraints: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockLecturers = [
  { id: '1', name: 'Dr. Smith' },
  { id: '2', name: 'Prof. Johnson' },
];

const mockStudentGroups = [
  { id: '1', name: 'CS Year 1 Group A' },
  { id: '2', name: 'CS Year 1 Group B' },
];

describe('CourseForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form for new course', () => {
    render(
      <CourseForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        availableLecturers={mockLecturers}
        availableStudentGroups={mockStudentGroups}
      />
    );

    expect(screen.getByText('Add New Course')).toBeInTheDocument();
    expect(screen.getByLabelText(/Course Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Course Code/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Duration \(minutes\)/)).toBeInTheDocument();
  });

  it('renders form for editing course', () => {
    render(
      <CourseForm
        open={true}
        course={mockCourse}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        availableLecturers={mockLecturers}
        availableStudentGroups={mockStudentGroups}
      />
    );

    expect(screen.getByText('Edit Course')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Course')).toBeInTheDocument();
    expect(screen.getByDisplayValue('TEST101')).toBeInTheDocument();
    expect(screen.getByDisplayValue('90')).toBeInTheDocument();
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    
    render(
      <CourseForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        availableLecturers={mockLecturers}
        availableStudentGroups={mockStudentGroups}
      />
    );

    await user.type(screen.getByLabelText(/Course Name/), 'New Course');
    await user.type(screen.getByLabelText(/Course Code/), 'NEW101');
    await user.type(screen.getByLabelText(/Duration \(minutes\)/), '60');

    // Select lecturer
    await user.click(screen.getByLabelText('Lecturer'));
    await user.click(screen.getByText('Dr. Smith'));

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Course',
          code: 'NEW101',
          duration: 60,
          lecturerId: '1',
        })
      );
    });
  });

  it('adds equipment correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <CourseForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        availableLecturers={mockLecturers}
        availableStudentGroups={mockStudentGroups}
      />
    );

    await user.type(screen.getByLabelText('Equipment Name'), 'Test Equipment');
    await user.click(screen.getAllByRole('button', { name: 'Add' })[0]);

    expect(screen.getByText(/Test Equipment/)).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <CourseForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        availableLecturers={mockLecturers}
        availableStudentGroups={mockStudentGroups}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnClose).toHaveBeenCalled();
  });
});