import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIProcessingIndicator } from '../AIProcessingIndicator';
import { AIProcessingState, OptimizationStatus } from '../../../types/ai';

const mockOnCancel = jest.fn();

const mockProcessingState: AIProcessingState = {
  isProcessing: true,
  currentTask: 'Analyzing constraints...',
  progress: 45,
  estimatedTimeRemaining: 120,
  logs: [
    {
      timestamp: new Date('2024-01-01T10:00:00'),
      level: 'info',
      message: 'Starting optimization process',
    },
    {
      timestamp: new Date('2024-01-01T10:01:00'),
      level: 'warning',
      message: 'Some constraints may be conflicting',
    },
    {
      timestamp: new Date('2024-01-01T10:02:00'),
      level: 'error',
      message: 'Failed to resolve constraint X',
    },
  ],
};

describe('AIProcessingIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders processing indicator for running optimization', () => {
    render(
      <AIProcessingIndicator
        processingState={mockProcessingState}
        status={OptimizationStatus.RUNNING}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('AI Optimization')).toBeInTheDocument();
    expect(screen.getByText('AI is optimizing your timetable...')).toBeInTheDocument();
    expect(screen.getByText('Analyzing constraints...')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('2m 0s remaining')).toBeInTheDocument();
  });

  it('shows correct status for different optimization states', () => {
    const { rerender } = render(
      <AIProcessingIndicator
        processingState={mockProcessingState}
        status={OptimizationStatus.PENDING}
      />
    );

    expect(screen.getByText('Preparing optimization...')).toBeInTheDocument();

    rerender(
      <AIProcessingIndicator
        processingState={mockProcessingState}
        status={OptimizationStatus.COMPLETED}
      />
    );

    expect(screen.getByText('Optimization completed successfully!')).toBeInTheDocument();

    rerender(
      <AIProcessingIndicator
        processingState={mockProcessingState}
        status={OptimizationStatus.FAILED}
      />
    );

    expect(screen.getByText('Optimization failed')).toBeInTheDocument();
  });

  it('displays progress bar with correct value', () => {
    render(
      <AIProcessingIndicator
        processingState={mockProcessingState}
        status={OptimizationStatus.RUNNING}
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '45');
  });

  it('shows cancel button when onCancel is provided and optimization is running', () => {
    render(
      <AIProcessingIndicator
        processingState={mockProcessingState}
        status={OptimizationStatus.RUNNING}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button');
    expect(cancelButton).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    render(
      <AIProcessingIndicator
        processingState={mockProcessingState}
        status={OptimizationStatus.RUNNING}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button');
    await userEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('does not show cancel button when optimization is completed', () => {
    render(
      <AIProcessingIndicator
        processingState={mockProcessingState}
        status={OptimizationStatus.COMPLETED}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('displays processing logs when showLogs is true', () => {
    render(
      <AIProcessingIndicator
        processingState={mockProcessingState}
        status={OptimizationStatus.RUNNING}
        showLogs={true}
      />
    );

    expect(screen.getByText('Processing Logs (3)')).toBeInTheDocument();
  });

  it('expands and collapses logs when clicked', async () => {
    render(
      <AIProcessingIndicator
        processingState={mockProcessingState}
        status={OptimizationStatus.RUNNING}
        showLogs={true}
      />
    );

    const logsHeader = screen.getByText('Processing Logs (3)');
    await userEvent.click(logsHeader);

    expect(screen.getByText('Starting optimization process')).toBeInTheDocument();
    expect(screen.getByText('Some constraints may be conflicting')).toBeInTheDocument();
    expect(screen.getByText('Failed to resolve constraint X')).toBeInTheDocument();

    // Click again to collapse
    await userEvent.click(logsHeader);
    expect(screen.queryByText('Starting optimization process')).not.toBeInTheDocument();
  });

  it('shows appropriate icons for different log levels', async () => {
    render(
      <AIProcessingIndicator
        processingState={mockProcessingState}
        status={OptimizationStatus.RUNNING}
        showLogs={true}
      />
    );

    const logsHeader = screen.getByText('Processing Logs (3)');
    await userEvent.click(logsHeader);

    // Check that different log level icons are present
    const logItems = screen.getAllByRole('listitem');
    expect(logItems.length).toBe(3);
  });

  it('formats time remaining correctly', () => {
    const processingStateWithShortTime: AIProcessingState = {
      ...mockProcessingState,
      estimatedTimeRemaining: 45,
    };

    render(
      <AIProcessingIndicator
        processingState={processingStateWithShortTime}
        status={OptimizationStatus.RUNNING}
      />
    );

    expect(screen.getByText('45s remaining')).toBeInTheDocument();
  });

  it('shows error alert for failed optimization', () => {
    render(
      <AIProcessingIndicator
        processingState={mockProcessingState}
        status={OptimizationStatus.FAILED}
      />
    );

    expect(screen.getByText(/The optimization process encountered an error/)).toBeInTheDocument();
  });

  it('shows warning alert for cancelled optimization', () => {
    render(
      <AIProcessingIndicator
        processingState={mockProcessingState}
        status={OptimizationStatus.CANCELLED}
      />
    );

    expect(screen.getByText(/The optimization process was cancelled/)).toBeInTheDocument();
  });

  it('does not render when completed and not processing', () => {
    const completedProcessingState: AIProcessingState = {
      ...mockProcessingState,
      isProcessing: false,
    };

    const { container } = render(
      <AIProcessingIndicator
        processingState={completedProcessingState}
        status={OptimizationStatus.COMPLETED}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('handles missing estimated time remaining', () => {
    const processingStateWithoutTime: AIProcessingState = {
      ...mockProcessingState,
      isProcessing: true,
      estimatedTimeRemaining: undefined,
    };

    render(
      <AIProcessingIndicator
        processingState={processingStateWithoutTime}
        status={OptimizationStatus.RUNNING}
      />
    );

    expect(screen.getByText('Calculating...')).toBeInTheDocument();
  });
});