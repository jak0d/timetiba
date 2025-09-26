import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  Container,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  CloudUpload,
  Analytics,
  Psychology as AIIcon,
  TableChart,
  CheckCircle,
  Visibility,
  PlayArrow,
  Done
} from '@mui/icons-material';

interface ProgressiveStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  requiresManualAdvancement: boolean;
  completed: boolean;
  processing: boolean;
}

export const ProgressiveImportDemo: React.FC = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<ProgressiveStep[]>([
    {
      id: 'upload',
      label: 'Upload Files',
      description: 'Upload your data files to begin the import process',
      icon: <CloudUpload />,
      requiresManualAdvancement: true,
      completed: false,
      processing: false
    },
    {
      id: 'analysis',
      label: 'File Analysis',
      description: 'Analyze file structure and choose import method',
      icon: <Analytics />,
      requiresManualAdvancement: true,
      completed: false,
      processing: false
    },
    {
      id: 'ai-processing',
      label: 'AI Processing',
      description: 'AI-powered entity detection and mapping',
      icon: <AIIcon />,
      requiresManualAdvancement: true,
      completed: false,
      processing: false
    },
    {
      id: 'mapping',
      label: 'Column Mapping',
      description: 'Map columns to system fields',
      icon: <TableChart />,
      requiresManualAdvancement: true,
      completed: false,
      processing: false
    },
    {
      id: 'validation',
      label: 'Data Validation',
      description: 'Validate data quality and integrity',
      icon: <CheckCircle />,
      requiresManualAdvancement: true,
      completed: false,
      processing: false
    },
    {
      id: 'preview',
      label: 'Preview & Review',
      description: 'Review data before final import',
      icon: <Visibility />,
      requiresManualAdvancement: true,
      completed: false,
      processing: false
    },
    {
      id: 'import',
      label: 'Import Execution',
      description: 'Execute the data import process',
      icon: <PlayArrow />,
      requiresManualAdvancement: true,
      completed: false,
      processing: false
    },
    {
      id: 'complete',
      label: 'Complete',
      description: 'Import completed successfully',
      icon: <Done />,
      requiresManualAdvancement: false,
      completed: false,
      processing: false
    }
  ]);

  const currentStep = steps[currentStepIndex];

  const simulateStepProcessing = async () => {
    // Mark current step as processing
    setSteps(prev => prev.map((step, index) => 
      index === currentStepIndex 
        ? { ...step, processing: true }
        : step
    ));

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mark current step as completed
    setSteps(prev => prev.map((step, index) => 
      index === currentStepIndex 
        ? { ...step, processing: false, completed: true }
        : step
    ));
  };

  const handleNext = async () => {
    if (!currentStep.completed && !currentStep.processing) {
      await simulateStepProcessing();
    }
    
    // Only advance if step is completed
    if (currentStep.completed && currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const canProceedToNext = () => {
    return currentStep.completed || !currentStep.requiresManualAdvancement;
  };

  const getNextButtonText = () => {
    if (currentStep.processing) {
      return 'Processing...';
    }
    if (!currentStep.completed) {
      return `Complete ${currentStep.label}`;
    }
    if (currentStepIndex === steps.length - 1) {
      return 'Finish';
    }
    return 'Next Step';
  };

  const resetDemo = () => {
    setCurrentStepIndex(0);
    setSteps(prev => prev.map(step => ({
      ...step,
      completed: false,
      processing: false
    })));
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Progressive Import Workflow Demo
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        This demo shows how users must manually advance through each step by clicking "Next" 
        after completing each stage. No automatic progression occurs.
      </Alert>

      {/* Progress Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Import Progress</Typography>
            <Chip 
              label={`Step ${currentStepIndex + 1} of ${steps.length}`} 
              color="primary" 
              variant="outlined"
            />
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={((currentStepIndex + (currentStep.completed ? 1 : 0)) / steps.length) * 100} 
            sx={{ mb: 2, height: 8, borderRadius: 4 }}
          />
          
          <Typography variant="body2" color="text.secondary">
            Current: {currentStep.label}
          </Typography>
        </CardContent>
      </Card>

      {/* Step Navigation */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={currentStepIndex} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.id} completed={step.completed}>
              <StepLabel 
                icon={step.processing ? <LinearProgress sx={{ width: 24, height: 24, borderRadius: '50%' }} /> : step.icon}
                error={false}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    {step.label}
                  </Typography>
                  {step.requiresManualAdvancement && (
                    <Chip label="Manual" size="small" variant="outlined" color="warning" />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </StepLabel>
              <StepContent>
                <Box sx={{ py: 2 }}>
                  {index === currentStepIndex && (
                    <>
                      {step.processing && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Processing {step.label.toLowerCase()}... Please wait.
                        </Alert>
                      )}
                      {step.completed && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                          {step.label} completed successfully! Click "Next Step" to continue.
                        </Alert>
                      )}
                      {!step.completed && !step.processing && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          Complete this step manually, then click "Next" to proceed.
                        </Alert>
                      )}
                    </>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Current Step Info */}
      <Card sx={{ mb: 3, border: '2px solid', borderColor: 'primary.main' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ color: 'primary.main', mr: 2 }}>
              {currentStep.processing ? <LinearProgress sx={{ width: 24, height: 24, borderRadius: '50%' }} /> : currentStep.icon}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" color="primary.main">
                {currentStep.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentStep.description}
              </Typography>
            </Box>
          </Box>

          {/* Progressive Workflow Indicator */}
          {!currentStep.processing && !currentStep.completed && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Complete this step and click "{getNextButtonText()}" to continue. 
              No automatic progression will occur.
            </Alert>
          )}

          {currentStep.processing && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="primary.main" sx={{ mb: 1 }}>
                Processing... Please wait for completion.
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {currentStep.completed && currentStepIndex < steps.length - 1 && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Step completed! You can now proceed to the next step.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="outlined"
          color="error"
          onClick={resetDemo}
          disabled={currentStep.processing}
        >
          Reset Demo
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0 || currentStep.processing}
          >
            Previous
          </Button>

          <Button
            variant="contained"
            onClick={handleNext}
            disabled={currentStep.processing || (currentStepIndex === steps.length - 1 && currentStep.completed)}
            sx={{ minWidth: 150 }}
          >
            {getNextButtonText()}
          </Button>
        </Box>
      </Box>

      {/* Instructions */}
      <Paper sx={{ p: 2, mt: 3, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Progressive Workflow Instructions:
        </Typography>
        <Typography variant="body2" component="div">
          <ul>
            <li>Each step must be manually completed by the user</li>
            <li>Click the "Complete [Step Name]" button to simulate step completion</li>
            <li>Only after completion can you advance to the next step</li>
            <li>No automatic progression occurs - user control is maintained</li>
            <li>Users can go back to previous steps if needed</li>
          </ul>
        </Typography>
      </Paper>
    </Container>
  );
};