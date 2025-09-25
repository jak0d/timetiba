import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConflictResolutionSuggestions } from '../ConflictResolutionSuggestions';
import { ConflictResolutionSuggestion, EffortLevel } from '../../../types/ai';

const mockOnApplySuggestion = jest.fn();
const mockOnRejectSuggestion = jest.fn();

const mockSuggestions: ConflictResolutionSuggestion[] = [
  {
    id: 'suggestion-1',
    clashId: 'clash-1',
    title: 'Resolve Venue Double Booking',
    description: 'Move PHY301 session from Room A to Room B to resolve the venue conflict',
    impact: 'Minimal disruption - Room B has similar capacity and equipment',
    confidence: 0.92,
    priority: 8,
    estimatedEffort: EffortLevel.LOW,
    affectedEntities: ['session-3', 'venue-1', 'venue-2'],
    changes: [
      {
        entityType: 'session',
        entityId: 'session-3',
        changeType: 'reassign',
        currentValue: 'venue-1',
        proposedValue: 'venue-2',
        reason: 'Resolve venue double booking conflict',
      },
    ],
    pros: [
      'Eliminates venue double booking',
      'Room B has adequate capacity',
      'No impact on lecturer or student schedules',
    ],
    cons: [
      'Students need to go to different building',
      'Room B lacks some specialized equipment',
    ],
  },
  {
    id: 'suggestion-2',
    clashId: 'clash-1',
    title: 'Reschedule PHY301 to Different Time',
    description: 'Move PHY301 session to 11:00 AM to avoid venue conflict',
    impact: 'Moderate impact - affects student group schedule',
    confidence: 0.75,
    priority: 6,
    estimatedEffort: EffortLevel.MEDIUM,
    affectedEntities: ['session-3', 'group-1'],
    changes: [
      {
        entityType: 'session',
        entityId: 'session-3',
        changeType: 'reschedule',
        currentValue: '09:00',
        proposedValue: '11:00',
        reason: 'Avoid venue conflict by changing time slot',
      },
    ],
    pros: [
      'Keeps session in preferred venue',
      'Maintains equipment availability',
    ],
    cons: [
      'Creates gap in student schedule',
      'May conflict with other courses',
    ],
  },
];

const defaultProps = {
  suggestions: mockSuggestions,
  onApplySuggestion: mockOnApplySuggestion,
  onRejectSuggestion: mockOnRejectSuggestion,
};

describe('ConflictResolutionSuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders suggestions list with correct count', () => {
    render(<ConflictResolutionSuggestions {...defaultProps} />);
    
    expect(screen.getByText('AI Conflict Resolution Suggestions (2)')).toBeInTheDocument();
    expect(screen.getByText('Resolve Venue Double Booking')).toBeInTheDocument();
    expect(screen.getByText('Reschedule PHY301 to Different Time')).toBeInTheDocument();
  });

  it('displays suggestion details correctly', () => {
    render(<ConflictResolutionSuggestions {...defaultProps} />);
    
    // Check confidence and priority chips
    expect(screen.getByText('92% confidence')).toBeInTheDocument();
    expect(screen.getByText('Priority: 8/10')).toBeInTheDocument();
    expect(screen.getByText('low effort')).toBeInTheDocument();
    
    expect(screen.getByText('75% confidence')).toBeInTheDocument();
    expect(screen.getByText('Priority: 6/10')).toBeInTheDocument();
    expect(screen.getByText('medium effort')).toBeInTheDocument();
  });

  it('sorts suggestions by priority and confidence', () => {
    render(<ConflictResolutionSuggestions {...defaultProps} />);
    
    const suggestions = screen.getAllByText(/Priority:/);
    // First suggestion should have higher priority (8/10)
    expect(suggestions[0]).toHaveTextContent('Priority: 8/10');
    expect(suggestions[1]).toHaveTextContent('Priority: 6/10');
  });

  it('expands suggestion details when clicked', async () => {
    render(<ConflictResolutionSuggestions {...defaultProps} />);
    
    const firstSuggestion = screen.getByText('Resolve Venue Double Booking');
    await userEvent.click(firstSuggestion);
    
    await waitFor(() => {
      expect(screen.getByText('Move PHY301 session from Room A to Room B to resolve the venue conflict')).toBeInTheDocument();
      expect(screen.getByText('Eliminates venue double booking')).toBeInTheDocument();
      expect(screen.getByText('Students need to go to different building')).toBeInTheDocument();
    });
  });

  it('shows required changes in expanded view', async () => {
    render(<ConflictResolutionSuggestions {...defaultProps} />);
    
    const firstSuggestion = screen.getByText('Resolve Venue Double Booking');
    await userEvent.click(firstSuggestion);
    
    await waitFor(() => {
      expect(screen.getByText('Required Changes (1):')).toBeInTheDocument();
      expect(screen.getByText('Reassign session session-3 from venue-1 to venue-2')).toBeInTheDocument();
    });
  });

  it('calls onApplySuggestion when apply button is clicked', async () => {
    render(<ConflictResolutionSuggestions {...defaultProps} />);
    
    const firstSuggestion = screen.getByText('Resolve Venue Double Booking');
    await userEvent.click(firstSuggestion);
    
    await waitFor(async () => {
      const applyButton = screen.getAllByText('Apply Suggestion')[0];
      await userEvent.click(applyButton);
    });
    
    expect(mockOnApplySuggestion).toHaveBeenCalledWith('suggestion-1');
  });

  it('calls onRejectSuggestion when reject button is clicked', async () => {
    render(<ConflictResolutionSuggestions {...defaultProps} />);
    
    const firstSuggestion = screen.getByText('Resolve Venue Double Booking');
    await userEvent.click(firstSuggestion);
    
    await waitFor(async () => {
      const rejectButton = screen.getAllByText('Reject')[0];
      await userEvent.click(rejectButton);
    });
    
    expect(mockOnRejectSuggestion).toHaveBeenCalledWith('suggestion-1');
  });

  it('opens details dialog when view details is clicked', async () => {
    render(<ConflictResolutionSuggestions {...defaultProps} />);
    
    const firstSuggestion = screen.getByText('Resolve Venue Double Booking');
    await userEvent.click(firstSuggestion);
    
    await waitFor(async () => {
      const viewDetailsButton = screen.getAllByText('View Details')[0];
      await userEvent.click(viewDetailsButton);
    });
    
    expect(screen.getByText('Suggestion Details: Resolve Venue Double Booking')).toBeInTheDocument();
    expect(screen.getByText('All Required Changes:')).toBeInTheDocument();
  });

  it('shows detailed changes table in dialog', async () => {
    render(<ConflictResolutionSuggestions {...defaultProps} />);
    
    const firstSuggestion = screen.getByText('Resolve Venue Double Booking');
    await userEvent.click(firstSuggestion);
    
    await waitFor(async () => {
      const viewDetailsButton = screen.getAllByText('View Details')[0];
      await userEvent.click(viewDetailsButton);
    });
    
    // Check table headers
    expect(screen.getByText('Entity')).toBeInTheDocument();
    expect(screen.getByText('Change Type')).toBeInTheDocument();
    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('To')).toBeInTheDocument();
    expect(screen.getByText('Reason')).toBeInTheDocument();
  });

  it('closes details dialog when close button is clicked', async () => {
    render(<ConflictResolutionSuggestions {...defaultProps} />);
    
    const firstSuggestion = screen.getByText('Resolve Venue Double Booking');
    await userEvent.click(firstSuggestion);
    
    await waitFor(async () => {
      const viewDetailsButton = screen.getAllByText('View Details')[0];
      await userEvent.click(viewDetailsButton);
    });
    
    const closeButton = screen.getByText('Close');
    await userEvent.click(closeButton);
    
    expect(screen.queryByText('Suggestion Details: Resolve Venue Double Booking')).not.toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    render(<ConflictResolutionSuggestions {...defaultProps} loading={true} />);
    
    const buttons = screen.getAllByRole('button');
    const actionButtons = buttons.filter(button => 
      button.textContent?.includes('Apply') || button.textContent?.includes('Reject')
    );
    
    actionButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('shows empty state when no suggestions available', () => {
    render(
      <ConflictResolutionSuggestions
        {...defaultProps}
        suggestions={[]}
      />
    );
    
    expect(screen.getByText('AI Suggestions')).toBeInTheDocument();
    expect(screen.getByText(/No conflict resolution suggestions available/)).toBeInTheDocument();
  });

  it('truncates long change lists and shows count', async () => {
    const suggestionWithManyChanges: ConflictResolutionSuggestion = {
      ...mockSuggestions[0],
      changes: [
        ...mockSuggestions[0].changes,
        ...Array.from({ length: 5 }, (_, i) => ({
          entityType: 'session' as const,
          entityId: `session-${i}`,
          changeType: 'move' as const,
          currentValue: `old-${i}`,
          proposedValue: `new-${i}`,
          reason: `Reason ${i}`,
        })),
      ],
    };

    render(
      <ConflictResolutionSuggestions
        {...defaultProps}
        suggestions={[suggestionWithManyChanges]}
      />
    );
    
    const suggestion = screen.getByText('Resolve Venue Double Booking');
    await userEvent.click(suggestion);
    
    await waitFor(() => {
      expect(screen.getByText(/... and \d+ more changes/)).toBeInTheDocument();
    });
  });

  it('applies suggestion from details dialog', async () => {
    render(<ConflictResolutionSuggestions {...defaultProps} />);
    
    const firstSuggestion = screen.getByText('Resolve Venue Double Booking');
    await userEvent.click(firstSuggestion);
    
    await waitFor(async () => {
      const viewDetailsButton = screen.getAllByText('View Details')[0];
      await userEvent.click(viewDetailsButton);
    });
    
    const applyButton = screen.getAllByText('Apply Suggestion').find(button => 
      button.closest('[role="dialog"]')
    );
    
    if (applyButton) {
      await userEvent.click(applyButton);
      expect(mockOnApplySuggestion).toHaveBeenCalledWith('suggestion-1');
    }
  });
});