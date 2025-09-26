import React from 'react';
import {
  Box,
  Breadcrumbs,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Card,
  CardContent,
  Stack,
  Divider
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Home as HomeIcon,
  CloudUpload as UploadIcon,
  TableChart as MappingIcon,
  CheckCircle as ValidationIcon,
  Visibility as PreviewIcon,
  PlayArrow as ImportIcon,
  Done as CompleteIcon,
  Psychology as AIIcon,
  Refresh as RestartIcon,
  Close as CancelIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface ImportStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed' | 'error' | 'skipped';
  optional?: boolean;
  estimatedTime?: string;
}

interface ImportNavigationProps {
  steps: ImportStep[];
  currentStepIndex: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isProcessing: boolean;
  progress?: number;
  nextButtonText?: string;
  onNext: () => void;
  onPrevious: () => void;
  onStepClick: (stepIndex: number) => void;
  onCancel: () => void;
  onRestart: () => void;
  showBreadcrumbs?: boolean;
  showProgress?: boolean;
  variant?: 'horizontal' | 'vertical';
}

export const ImportNavigation: React.FC<ImportNavigationProps> = ({
  steps,
  currentStepIndex,
  canGoNext,
  canGoPrevious,
  isProcessing,
  progress,
  nextButtonText,
  onNext,
  onPrevious,
  onStepClick,
  onCancel,
  onRestart,
  showBreadcrumbs = true,
  showProgress = true,
  variant = 'horizontal'
}) => {
  const currentStep = steps[currentStepIndex];
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;

  const getStepIcon = (step: ImportStep, index: number) => {
    if (step.status === 'completed') {
      return <CompleteIcon color="success" />;
    }
    if (step.status === 'error') {
      return <CompleteIcon color="error" />;
    }
    if (step.status === 'active') {
      return step.icon;
    }
    return step.icon;
  };

  const getStepColor = (step: ImportStep) => {
    switch (step.status) {
      case 'completed': return 'success';
      case 'active': return 'primary';
      case 'error': return 'error';
      default: return 'grey';
    }
  };

  const canClickStep = (stepIndex: number) => {
    // Can click on completed steps or the current step
    return stepIndex <= currentStepIndex || steps[stepIndex].status === 'completed';
  };

  return (
    <Box>
      {/* Breadcrumbs */}
      {showBreadcrumbs && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Breadcrumbs separator={<NextIcon fontSize="small" />}>
            <Button
              startIcon={<HomeIcon />}
              onClick={() => onCancel()}
              sx={{ textTransform: 'none' }}
            >
              Import
            </Button>
            {steps.slice(0, currentStepIndex + 1).map((step, index) => (
              <Typography
                key={step.id}
                color={index === currentStepIndex ? 'primary' : 'text.secondary'}
                sx={{ 
                  fontWeight: index === currentStepIndex ? 600 : 400,
                  cursor: canClickStep(index) ? 'pointer' : 'default'
                }}
                onClick={() => canClickStep(index) && onStepClick(index)}
              >
                {step.label}
              </Typography>
            ))}
          </Breadcrumbs>
        </Paper>
      )}

      {/* Progress Overview */}
      {showProgress && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Import Progress</Typography>
              <Chip 
                label={`${completedSteps}/${totalSteps} Steps`} 
                color="primary" 
                variant="outlined"
              />
            </Box>
            
            <LinearProgress 
              variant="determinate" 
              value={(completedSteps / totalSteps) * 100} 
              sx={{ mb: 2, height: 8, borderRadius: 4 }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Current: {currentStep?.label}
              </Typography>
              {currentStep?.estimatedTime && (
                <Typography variant="body2" color="text.secondary">
                  Est. time: {currentStep.estimatedTime}
                </Typography>
              )}
            </Box>

            {progress !== undefined && isProcessing && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Processing... {Math.round(progress)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={progress} 
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step Navigation */}
      <Paper sx={{ p: 3, mb: 3 }}>
        {variant === 'horizontal' ? (
          <Stepper activeStep={currentStepIndex} alternativeLabel>
            {steps.map((step, index) => (
              <Step 
                key={step.id}
                completed={step.status === 'completed'}
                disabled={!canClickStep(index)}
              >
                <StepLabel 
                  icon={getStepIcon(step, index)}
                  error={step.status === 'error'}
                  onClick={() => canClickStep(index) && onStepClick(index)}
                  sx={{ cursor: canClickStep(index) ? 'pointer' : 'default' }}
                >
                  <Typography variant="subtitle2">{step.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {step.description}
                  </Typography>
                  {step.optional && (
                    <Chip label="Optional" size="small" variant="outlined" sx={{ mt: 0.5 }} />
                  )}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        ) : (
          <Stepper activeStep={currentStepIndex} orientation="vertical">
            {steps.map((step, index) => (
              <Step 
                key={step.id}
                completed={step.status === 'completed'}
                disabled={!canClickStep(index)}
              >
                <StepLabel 
                  icon={getStepIcon(step, index)}
                  error={step.status === 'error'}
                  onClick={() => canClickStep(index) && onStepClick(index)}
                  sx={{ cursor: canClickStep(index) ? 'pointer' : 'default' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                      {step.label}
                    </Typography>
                    {step.optional && (
                      <Chip label="Optional" size="small" variant="outlined" />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {step.status === 'active' && 'Currently active step'}
                    {step.status === 'completed' && 'Step completed successfully'}
                    {step.status === 'error' && 'Step completed with errors'}
                    {step.status === 'pending' && 'Waiting to start'}
                  </Typography>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        )}
      </Paper>

      {/* Current Step Info */}
      <Card sx={{ mb: 3, border: '2px solid', borderColor: 'primary.main' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ color: 'primary.main', mr: 2 }}>
              {currentStep?.icon}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" color="primary.main">
                {currentStep?.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentStep?.description}
              </Typography>
            </Box>
            {currentStep?.estimatedTime && (
              <Chip 
                label={`~${currentStep.estimatedTime}`} 
                color="primary" 
                variant="outlined"
                size="small"
              />
            )}
          </Box>

          {/* Progressive Workflow Indicator */}
          {!isProcessing && canGoNext && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              mb: 2,
              p: 1.5,
              bgcolor: 'info.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'info.200'
            }}>
              <InfoIcon color="info" fontSize="small" />
              <Typography variant="body2" color="info.main">
                Complete this step and click "{nextButtonText || 'Next'}" to continue
              </Typography>
            </Box>
          )}

          {isProcessing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="body2" color="primary.main">
                Processing...
              </Typography>
              {progress !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  {Math.round(progress)}%
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Cancel import">
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={onCancel}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </Tooltip>

          {currentStepIndex > 0 && (
            <Tooltip title="Restart import">
              <IconButton
                color="warning"
                onClick={onRestart}
                disabled={isProcessing}
              >
                <RestartIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PrevIcon />}
            onClick={onPrevious}
            disabled={!canGoPrevious || isProcessing}
          >
            Previous
          </Button>

          <Button
            variant="contained"
            endIcon={<NextIcon />}
            onClick={onNext}
            disabled={!canGoNext || isProcessing}
            sx={{ minWidth: 120 }}
          >
            {nextButtonText || (currentStepIndex === steps.length - 1 ? 'Finish' : 'Next')}
          </Button>
        </Box>
      </Box>

      {/* Step Status Legend */}
      <Paper sx={{ p: 2, mt: 3, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Step Status Legend
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CompleteIcon color="success" fontSize="small" />
            <Typography variant="caption">Completed</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CompleteIcon color="primary" fontSize="small" />
            <Typography variant="caption">Active</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CompleteIcon color="disabled" fontSize="small" />
            <Typography variant="caption">Pending</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CompleteIcon color="error" fontSize="small" />
            <Typography variant="caption">Error</Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};