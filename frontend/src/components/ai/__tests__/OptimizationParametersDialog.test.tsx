import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OptimizationParametersDialog } from '../OptimizationParametersDialog';
import { OptimizationParameters } from '../../../types/ai';

const mockOnClose = jest.fn();
const mockOnConfirm = jest.fn();

const defaultProps = {
  open: true,
  onClose: mockOnClose,
  onConfirm: mockOnConfirm,
};

describe('OptimizationParametersDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog with default parameters', () => {
    render(<OptimizationParametersDialog {...defaultProps} />);
    
    expect(screen.getByText('AI Optimization Parameters')).toBeInTheDocument();
    expect(screen.getByText('Basic Parameters')).toBeInTheDocument();
    expect(screen.getByText('Optimization Goals')).toBeInTheDocument();
    expect(screen.getByText('Priority Weights')).toBeInTheDocument();
  });

  it('displays default parameter values', () => {
    render(<OptimizationParametersDialog {...defaultProps} />);
    
    // Check default values
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument(); // Max iterations
    expect(screen.getByDisplayValue('300')).toBeInTheDocument(); // Time limit
    
    // Check switches are enabled by default
    expect(screen.getByLabelText('Prioritize Lecturer Preferences')).toBeChecked();
    expect(screen.getByLabelText('Minimize Schedule Gaps')).toBeChecked();
    expect(screen.getByLabelText('Maximize Venue Utilization')).toBeChecked();
    expect(screen.getByLabelText('Balance Workload')).toBeChecked();
  });

  it('allows modification of basic parameters', async () => {
    render(<OptimizationParametersDialog {...defaultProps} />);
    
    const maxIterationsInput = screen.getByDisplayValue('1000');
    await userEvent.clear(maxIterationsInput);
    await userEvent.type(maxIterationsInput, '2000');
    
    expect(screen.getByDisplayValue('2000')).toBeInTheDocument();
  });

  it('allows toggling optimization goals', async () => {
    render(<OptimizationParametersDialog {...defaultProps} />);
    
    // First expand the optimization goals section
    const optimizationGoalsButton = screen.getByText('Optimization Goals');
    await userEvent.click(optimizationGoalsButton);
    
    await waitFor(() => {
      const preferenceSwitch = screen.getByLabelText('Prioritize Lecturer Preferences');
      return userEvent.click(preferenceSwitch);
    });
    
    const preferenceSwitch = screen.getByLabelText('Prioritize Lecturer Preferences');
    expect(preferenceSwitch).not.toBeChecked();
  });

  it('allows adjustment of weight sliders', async () => {
    render(<OptimizationParametersDialog {...defaultProps} />);
    
    // First expand the priority weights section
    const priorityWeightsButton = screen.getByText('Priority Weights');
    await userEvent.click(priorityWeightsButton);
    
    await waitFor(() => {
      // Find lecturer preferences slider
      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBeGreaterThan(0);
      
      // Simulate slider change
      fireEvent.change(sliders[0], { target: { value: 90 } });
    });
    
    // Check that percentage is updated
    await waitFor(() => {
      expect(screen.getByText('90%')).toBeInTheDocument();
    });
  });

  it('calls onConfirm with parameters when confirmed', async () => {
    render(<OptimizationParametersDialog {...defaultProps} />);
    
    const confirmButton = screen.getByText('Start Optimization');
    await userEvent.click(confirmButton);
    
    expect(mockOnConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        maxIterations: 1000,
        timeLimit: 300,
        prioritizePreferences: true,
        weights: expect.objectContaining({
          lecturerPreferences: expect.any(Number),
          studentConvenience: expect.any(Number),
        }),
      })
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when cancelled', async () => {
    render(<OptimizationParametersDialog {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    await userEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('resets parameters when reset button is clicked', async () => {
    render(<OptimizationParametersDialog {...defaultProps} />);
    
    // Modify a parameter
    const maxIterationsInput = screen.getByDisplayValue('1000');
    await userEvent.clear(maxIterationsInput);
    await userEvent.type(maxIterationsInput, '5000');
    
    // Click reset
    const resetButton = screen.getByLabelText('Reset to defaults');
    await userEvent.click(resetButton);
    
    // Check that value is reset
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
  });

  it('uses initial parameters when provided', () => {
    const initialParameters: OptimizationParameters = {
      maxIterations: 500,
      timeLimit: 600,
      prioritizePreferences: false,
      minimizeGaps: false,
      maximizeVenueUtilization: false,
      balanceWorkload: false,
      weights: {
        lecturerPreferences: 0.5,
        studentConvenience: 0.3,
        venueUtilization: 0.7,
        timeEfficiency: 0.8,
        workloadBalance: 0.4,
      },
    };

    render(
      <OptimizationParametersDialog
        {...defaultProps}
        initialParameters={initialParameters}
      />
    );
    
    expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    expect(screen.getByDisplayValue('600')).toBeInTheDocument();
    expect(screen.getByLabelText('Prioritize Lecturer Preferences')).not.toBeChecked();
  });

  it('shows help tooltips', async () => {
    render(<OptimizationParametersDialog {...defaultProps} />);
    
    const helpIcons = screen.getAllByLabelText(/Maximum number of optimization iterations/);
    expect(helpIcons.length).toBeGreaterThan(0);
    
    // Hover over first help icon
    await userEvent.hover(helpIcons[0]);
    
    await waitFor(() => {
      expect(screen.getByText(/Maximum number of optimization iterations/)).toBeInTheDocument();
    });
  });

  it('validates parameter ranges', async () => {
    render(<OptimizationParametersDialog {...defaultProps} />);
    
    const maxIterationsInput = screen.getByDisplayValue('1000');
    await userEvent.clear(maxIterationsInput);
    await userEvent.type(maxIterationsInput, '50'); // Below minimum
    
    // Input should enforce minimum value
    expect(maxIterationsInput).toHaveAttribute('min', '100');
  });
});