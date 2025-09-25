import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentGroupForm } from '../StudentGroupForm';
import { StudentGroup } from '../../../types/entities';

const mockStudentGroup: StudentGroup = {
  id: '1',
  name: 'CS Year 1 Group A',
  size: 25,
  yearLevel: 1,
  department: 'Computer Science',
  courses: ['1', '2'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCourses = [
  { id: '1', name: 'Programming Fundamentals', code: 'CS101' },
  { id: '2', name: 'Mathematics', code: 'MATH101' },
];

describe('StudentGroupForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form for new student group', () => {
    render(
      <StudentGroupForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        availableCourses={mockCourses}
      />
    );

    expect(screen.getByText('Add New Student Group')).toBeInTheDocument();
    expect(screen.getByLabelText(/Group Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Group Size/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Department/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Year Level/)).toBeInTheDocument();
  });

  it('renders form for editing student group', () => {
    render(
      <StudentGroupForm
        open={true}
        studentGroup={mockStudentGroup}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        availableCourses={mockCourses}
      />
    );

    expect(screen.getByText('Edit Student Group')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CS Year 1 Group A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Computer Science')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    
    render(
      <StudentGroupForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        availableCourses={mockCourses}
      />
    );

    await user.type(screen.getByLabelText(/Group Name/), 'New Group');
    await user.type(screen.getByLabelText(/Group Size/), '30');
    await user.type(screen.getByLabelText(/Department/), 'Mathematics');
    await user.type(screen.getByLabelText(/Year Level/), '2');

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'New Group',
        size: 30,
        department: 'Mathematics',
        yearLevel: 2,
        courses: [],
      });
    });
  });

  it('displays group summary correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <StudentGroupForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        availableCourses={mockCourses}
      />
    );

    await user.type(screen.getByLabelText(/Group Size/), '25');
    await user.type(screen.getByLabelText(/Department/), 'Computer Science');

    expect(screen.getByText('25 students')).toBeInTheDocument();
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <StudentGroupForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        availableCourses={mockCourses}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnClose).toHaveBeenCalled();
  });
});