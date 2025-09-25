import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ColumnMappingInterface } from '../ColumnMappingInterface';

const mockTargetFields = [
  { name: 'venueName', label: 'Venue Name', required: true, dataType: 'string', description: 'Name of the venue' },
  { name: 'lecturerName', label: 'Lecturer Name', required: true, dataType: 'string', description: 'Full name of the lecturer' },
  { name: 'courseCode', label: 'Course Code', required: false, dataType: 'string', description: 'Course identifier' }
];

const mockSourceColumns = ['Venue', 'Instructor', 'Course'];

describe('ColumnMappingInterface', () => {
  const mockOnMappingChange = jest.fn();
  const mockOnValidationChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders column mapping interface', () => {
    render(
      <ColumnMappingInterface
        sourceColumns={mockSourceColumns}
        targetFields={mockTargetFields}
        onMappingChange={mockOnMappingChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    expect(screen.getByText('Column Mapping')).toBeInTheDocument();
    expect(screen.getByText('Auto-map')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('displays source columns', () => {
    render(
      <ColumnMappingInterface
        sourceColumns={mockSourceColumns}
        targetFields={mockTargetFields}
        onMappingChange={mockOnMappingChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    mockSourceColumns.forEach(column => {
      expect(screen.getByText(column)).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    render(
      <ColumnMappingInterface
        sourceColumns={mockSourceColumns}
        targetFields={mockTargetFields}
        onMappingChange={mockOnMappingChange}
        onValidationChange={mockOnValidationChange}
        loading={true}
      />
    );

    expect(screen.getByText('Analyzing columns...')).toBeInTheDocument();
  });

  it('handles mapping selection', async () => {
    render(
      <ColumnMappingInterface
        sourceColumns={mockSourceColumns}
        targetFields={mockTargetFields}
        onMappingChange={mockOnMappingChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    // Wait for auto-mapping to complete
    await waitFor(() => {
      expect(mockOnMappingChange).toHaveBeenCalled();
    });

    // Find and click on a dropdown
    const dropdowns = screen.getAllByRole('button', { name: /target field/i });
    if (dropdowns.length > 0) {
      fireEvent.mouseDown(dropdowns[0]);
      
      // Select an option
      const option = screen.getByText('Venue Name');
      fireEvent.click(option);

      expect(mockOnMappingChange).toHaveBeenCalled();
    }
  });

  it('displays validation errors', () => {
    const initialMappings = [
      {
        sourceColumn: 'Venue',
        targetField: '',
        confidence: 0,
        required: false,
        dataType: 'string',
        suggestions: []
      }
    ];

    render(
      <ColumnMappingInterface
        sourceColumns={mockSourceColumns}
        targetFields={mockTargetFields}
        initialMappings={initialMappings}
        onMappingChange={mockOnMappingChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    expect(screen.getByText(/mapping errors/i)).toBeInTheDocument();
  });

  it('shows confidence indicators', async () => {
    const initialMappings = [
      {
        sourceColumn: 'Venue',
        targetField: 'venueName',
        confidence: 85,
        required: true,
        dataType: 'string',
        suggestions: ['venueName']
      }
    ];

    render(
      <ColumnMappingInterface
        sourceColumns={mockSourceColumns}
        targetFields={mockTargetFields}
        initialMappings={initialMappings}
        onMappingChange={mockOnMappingChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('handles auto-mapping button click', () => {
    render(
      <ColumnMappingInterface
        sourceColumns={mockSourceColumns}
        targetFields={mockTargetFields}
        onMappingChange={mockOnMappingChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    const autoMapButton = screen.getByText('Auto-map');
    fireEvent.click(autoMapButton);

    expect(mockOnMappingChange).toHaveBeenCalled();
  });

  it('handles reset button click', () => {
    render(
      <ColumnMappingInterface
        sourceColumns={mockSourceColumns}
        targetFields={mockTargetFields}
        onMappingChange={mockOnMappingChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    expect(mockOnMappingChange).toHaveBeenCalled();
  });
});