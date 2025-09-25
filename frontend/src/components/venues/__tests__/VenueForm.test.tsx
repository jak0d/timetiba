import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VenueForm } from '../VenueForm';
import { Venue, EquipmentType, AccessibilityFeature } from '../../../types/entities';

const mockVenue: Venue = {
  id: '1',
  name: 'Test Venue',
  capacity: 100,
  location: 'Building A, Floor 1',
  equipment: [
    { id: '1', name: 'Projector', type: EquipmentType.PROJECTOR },
  ],
  accessibility: [AccessibilityFeature.WHEELCHAIR_ACCESSIBLE],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('VenueForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form for new venue', () => {
    render(
      <VenueForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('Add New Venue')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /venue name/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /capacity/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /location/i })).toBeInTheDocument();
  });

  it('renders form for editing venue', () => {
    render(
      <VenueForm
        open={true}
        venue={mockVenue}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('Edit Venue')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Venue')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Building A, Floor 1')).toBeInTheDocument();
  });

  it('submits form with correct data', async () => {
    render(
      <VenueForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const nameInput = screen.getByRole('textbox', { name: /venue name/i });
    const capacityInput = screen.getByRole('spinbutton', { name: /capacity/i });
    const locationInput = screen.getByRole('textbox', { name: /location/i });

    await userEvent.type(nameInput, 'New Venue');
    await userEvent.type(capacityInput, '50');
    await userEvent.type(locationInput, 'Building B');

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'New Venue',
        capacity: 50,
        location: 'Building B',
        equipment: [],
        accessibility: [],
      });
    });
  });

  it('adds equipment correctly', async () => {
    render(
      <VenueForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const equipmentInput = screen.getByRole('textbox', { name: /equipment name/i });
    await userEvent.type(equipmentInput, 'Test Equipment');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Test Equipment (PROJECTOR)')).toBeInTheDocument();
  });

  it('handles accessibility features', async () => {
    render(
      <VenueForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const wheelchairCheckbox = screen.getByRole('checkbox', { name: /wheelchair accessible/i });
    await userEvent.click(wheelchairCheckbox);

    expect(wheelchairCheckbox).toBeChecked();
  });

  it('calls onClose when cancel is clicked', async () => {
    render(
      <VenueForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnClose).toHaveBeenCalled();
  });
});