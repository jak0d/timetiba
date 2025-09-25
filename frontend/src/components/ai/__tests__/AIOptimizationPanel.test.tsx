import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIOptimizationPanel } from '../AIOptimizationPanel';
import { OptimizationResult, OptimizationStatus, ConflictResolutionSuggestion, EffortLevel } from '../../../types/ai';
import { Clash, ClashType, Severity } from '../../../types/entities';

const mockOnStartOptimization = jest.fn();
const mockOnApplySuggestion = jest.fn();
const mockOnRejectSuggestion = jest.fn();
const mockOnCancelOptimization = jest.fn();

const mockClashes: Clash[] = [
  {
    id: 'clash-1',
    type: ClashType.VENUE_DOUBLE_BOOKING,
    severity: Severity.HIGH,
    affectedEntities: ['session-1', 'session-2'],
    description: 'Venue double booking detected',
    suggestedResolutions: [],
  },
];

const mockOptimizationResult: OptimizationResult = {
  id: 'opt-1',
  status: OptimizationStatus.COMPLETED,
  progress: 100,
  startTime: new Date(),
  endTime: new Date(),
  metrics: {
    totalClashes: 2,
    resolvedClashes: 1,
    improvementScore: 0.85,
    executionTime: 3.2,
    iterationsCompleted: 150,
    constraintsSatisfied: 9,
    constraintsTotal: 10,
  },
  suggestions: [
    {
      id: 'suggestion-1',
      clashId: 'clash-1',
      title: 'Test Suggestion',
      description: 'Test description',
      impact: 'Test impact',
      confidence: 0.9,
      priority: 8,
      estimatedEffort: EffortLevel.LOW,
      affectedEntities: ['entity-1'],
      changes: [],
      pros: ['Pro 1'],
      cons: ['Con 1'],
    },
  ],
};

const defaultProps = {
  clashes: mockClashes,
  onStartOptimization: mockOnStartOptimization,
  onApplySuggestion: mockOnApplySuggestion,
  onRejectSuggestion: mockOnRejectSuggestion,
};

describe('AIOptimizationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders optimization panel with clash warning', () => {
    render(<AIOptimizationPanel {...defaultProps} />);
    
    expect(screen.getByText('AI Optimization')).toBeInTheDocument();
    expect(screen.getByText(/1 scheduling conflicts detected/)).toBeInTheDocument();
    expect(screen.getByText('Configure Parameters')).toBeInTheDocument();
    expect(screen.getByText('Start AI Optimization')).toBeInTheDocument();
  });

  it('shows success message when no clashes exist', () => {
    render(<AIOptimizationPanel {...defaultProps} clashes={[]} />);
    
    expect(screen.getByText('No conflicts detected in the current timetable.')).toBeInTheDocument();
  });

  it('opens parameters dialog when configure button is clicked', async () => {
    render(<AIOptimizationPanel {...defaultProps} />);
    
    const configureButton = screen.getByText('Configure Parameters');
    await userEvent.click(configureButton);
    
    expect(screen.getByText('AI Optimization Parameters')).toBeInTheDocument();
  });

  it('opens parameters dialog when start optimization button is clicked', async () => {
    render(<AIOptimizationPanel {...defaultProps} />);
    
    const startButton = screen.getByText('Start AI Optimization');
    await userEvent.click(startButton);
    
    expect(screen.getByText('AI Optimization Parameters')).toBeInTheDocument();
  });

  it('calls onStartOptimization when parameters are confirmed', async () => {
    render(<AIOptimizationPanel {...defaultProps} />);
    
    const startButton = screen.getByText('Start AI Optimization');
    await userEvent.click(startButton);
    
    const confirmButton = screen.getByText('Start Optimization');
    await userEvent.click(confirmButton);
    
    expect(mockOnStartOptimization).toHaveBeenCalledWith(
      expect.objectContaining({
        maxIterations: expect.any(Number),
        timeLimit: expect.any(Number),
      })
    );
  });

  it('displays optimization results when available', () => {
    render(
      <AIOptimizationPanel
        {...defaultProps}
        optimizationResult={mockOptimizationResult}
      />
    );
    
    expect(screen.getByText('Optimization Results:')).toBeInTheDocument();
    expect(screen.getByText('• Clashes resolved: 1 / 2')).toBeInTheDocument();
    expect(screen.getByText('• Improvement score: 85%')).toBeInTheDocument();
    expect(screen.getByText('• Execution time: 3.2s')).toBeInTheDocument();
    expect(screen.getByText('• Constraints satisfied: 9 / 10')).toBeInTheDocument();
  });

  it('shows AI processing indicator when optimization is running', () => {
    const runningResult: OptimizationResult = {
      ...mockOptimizationResult,
      status: OptimizationStatus.RUNNING,
    };

    render(
      <AIOptimizationPanel
        {...defaultProps}
        optimizationResult={runningResult}
      />
    );
    
    expect(screen.getByText('AI is optimizing your timetable...')).toBeInTheDocument();
  });

  it('displays conflict resolution suggestions', () => {
    render(
      <AIOptimizationPanel
        {...defaultProps}
        optimizationResult={mockOptimizationResult}
      />
    );
    
    expect(screen.getByText('AI Conflict Resolution Suggestions (1)')).toBeInTheDocument();
    expect(screen.getByText('Test Suggestion')).toBeInTheDocument();
  });

  it('disables buttons when optimization is running', () => {
    const runningResult: OptimizationResult = {
      ...mockOptimizationResult,
      status: OptimizationStatus.RUNNING,
    };

    render(
      <AIOptimizationPanel
        {...defaultProps}
        optimizationResult={runningResult}
      />
    );
    
    expect(screen.getByText('Configure Parameters')).toBeDisabled();
    expect(screen.getByText('Start AI Optimization')).toBeDisabled();
  });

  it('disables buttons when loading', () => {
    render(<AIOptimizationPanel {...defaultProps} loading={true} />);
    
    expect(screen.getByText('Start AI Optimization')).toBeDisabled();
  });

  it('shows cancel button when optimization is running and onCancel is provided', () => {
    const runningResult: OptimizationResult = {
      ...mockOptimizationResult,
      status: OptimizationStatus.RUNNING,
    };

    render(
      <AIOptimizationPanel
        {...defaultProps}
        optimizationResult={runningResult}
        onCancelOptimization={mockOnCancelOptimization}
      />
    );
    
    // Cancel button should be in the processing indicator
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it('calls onCancelOptimization when cancel is clicked', async () => {
    const runningResult: OptimizationResult = {
      ...mockOptimizationResult,
      status: OptimizationStatus.RUNNING,
    };

    render(
      <AIOptimizationPanel
        {...defaultProps}
        optimizationResult={runningResult}
        onCancelOptimization={mockOnCancelOptimization}
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelButton);
    
    expect(mockOnCancelOptimization).toHaveBeenCalled();
  });

  it('handles apply suggestion correctly', async () => {
    render(
      <AIOptimizationPanel
        {...defaultProps}
        optimizationResult={mockOptimizationResult}
      />
    );
    
    // Expand suggestion
    const suggestionTitle = screen.getByText('Test Suggestion');
    await userEvent.click(suggestionTitle);
    
    await waitFor(async () => {
      const applyButton = screen.getByText('Apply Suggestion');
      await userEvent.click(applyButton);
    });
    
    expect(mockOnApplySuggestion).toHaveBeenCalledWith('suggestion-1');
  });

  it('handles reject suggestion correctly', async () => {
    render(
      <AIOptimizationPanel
        {...defaultProps}
        optimizationResult={mockOptimizationResult}
      />
    );
    
    // Expand suggestion
    const suggestionTitle = screen.getByText('Test Suggestion');
    await userEvent.click(suggestionTitle);
    
    await waitFor(async () => {
      const rejectButton = screen.getByText('Reject');
      await userEvent.click(rejectButton);
    });
    
    expect(mockOnRejectSuggestion).toHaveBeenCalledWith('suggestion-1');
  });

  it('shows snackbar messages for successful operations', async () => {
    render(<AIOptimizationPanel {...defaultProps} />);
    
    const startButton = screen.getByText('Start AI Optimization');
    await userEvent.click(startButton);
    
    const confirmButton = screen.getByText('Start Optimization');
    await userEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText('Optimization started successfully')).toBeInTheDocument();
    });
  });

  it('handles optimization start failure', async () => {
    mockOnStartOptimization.mockRejectedValueOnce(new Error('Network error'));
    
    render(<AIOptimizationPanel {...defaultProps} />);
    
    const startButton = screen.getByText('Start AI Optimization');
    await userEvent.click(startButton);
    
    const confirmButton = screen.getByText('Start Optimization');
    await userEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to start optimization')).toBeInTheDocument();
    });
  });

  it('updates processing state during optimization', async () => {
    jest.useFakeTimers();
    
    const runningResult: OptimizationResult = {
      ...mockOptimizationResult,
      status: OptimizationStatus.RUNNING,
    };

    render(
      <AIOptimizationPanel
        {...defaultProps}
        optimizationResult={runningResult}
      />
    );
    
    // Fast-forward time to trigger processing updates
    jest.advanceTimersByTime(2000);
    
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });

  it('shows processing logs when available', async () => {
    const user = userEvent.setup();
    const runningResult: OptimizationResult = {
      ...mockOptimizationResult,
      status: OptimizationStatus.RUNNING,
    };

    render(
      <AIOptimizationPanel
        {...defaultProps}
        optimizationResult={runningResult}
      />
    );
    
    // Processing logs should be visible in the processing indicator
    expect(screen.getByText(/Processing Logs/)).toBeInTheDocument();
  });
});