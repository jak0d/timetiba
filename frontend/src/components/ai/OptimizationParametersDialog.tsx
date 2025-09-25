import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Slider,
  FormControlLabel,
  Switch,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Help as HelpIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import { OptimizationParameters, OptimizationWeights } from '../../types/ai';

interface OptimizationParametersDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (parameters: OptimizationParameters) => void;
  initialParameters?: OptimizationParameters;
}

const defaultParameters: OptimizationParameters = {
  maxIterations: 1000,
  timeLimit: 300, // 5 minutes
  prioritizePreferences: true,
  minimizeGaps: true,
  maximizeVenueUtilization: true,
  balanceWorkload: true,
  weights: {
    lecturerPreferences: 0.8,
    studentConvenience: 0.7,
    venueUtilization: 0.6,
    timeEfficiency: 0.9,
    workloadBalance: 0.5,
  },
};

export const OptimizationParametersDialog: React.FC<OptimizationParametersDialogProps> = ({
  open,
  onClose,
  onConfirm,
  initialParameters = defaultParameters,
}) => {
  const [parameters, setParameters] = useState<OptimizationParameters>(initialParameters);

  const handleWeightChange = (key: keyof OptimizationWeights, value: number) => {
    setParameters(prev => ({
      ...prev,
      weights: {
        ...prev.weights,
        [key]: value / 100, // Convert percentage to decimal
      },
    }));
  };

  const handleParameterChange = (key: keyof OptimizationParameters, value: any) => {
    setParameters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setParameters(defaultParameters);
  };

  const handleConfirm = () => {
    onConfirm(parameters);
    onClose();
  };

  const getWeightColor = (weight: number) => {
    if (weight >= 0.8) return 'success';
    if (weight >= 0.6) return 'warning';
    return 'error';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">AI Optimization Parameters</Typography>
          <Tooltip title="Reset to defaults">
            <IconButton onClick={handleReset}>
              <ResetIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {/* Basic Parameters */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Basic Parameters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2">Max Iterations</Typography>
                      <Tooltip title="Maximum number of optimization iterations">
                        <IconButton size="small">
                          <HelpIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <TextField
                      type="number"
                      value={parameters.maxIterations}
                      onChange={(e) => handleParameterChange('maxIterations', parseInt(e.target.value))}
                      inputProps={{ min: 100, max: 10000, step: 100 }}
                      fullWidth
                      size="small"
                    />
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2">Time Limit (seconds)</Typography>
                      <Tooltip title="Maximum time allowed for optimization">
                        <IconButton size="small">
                          <HelpIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <TextField
                      type="number"
                      value={parameters.timeLimit}
                      onChange={(e) => handleParameterChange('timeLimit', parseInt(e.target.value))}
                      inputProps={{ min: 30, max: 3600, step: 30 }}
                      fullWidth
                      size="small"
                    />
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Optimization Goals */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Optimization Goals</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={parameters.prioritizePreferences}
                        onChange={(e) => handleParameterChange('prioritizePreferences', e.target.checked)}
                      />
                    }
                    label="Prioritize Lecturer Preferences"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={parameters.minimizeGaps}
                        onChange={(e) => handleParameterChange('minimizeGaps', e.target.checked)}
                      />
                    }
                    label="Minimize Schedule Gaps"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={parameters.maximizeVenueUtilization}
                        onChange={(e) => handleParameterChange('maximizeVenueUtilization', e.target.checked)}
                      />
                    }
                    label="Maximize Venue Utilization"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={parameters.balanceWorkload}
                        onChange={(e) => handleParameterChange('balanceWorkload', e.target.checked)}
                      />
                    }
                    label="Balance Workload"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Weight Configuration */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Priority Weights</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Adjust the importance of different optimization criteria (0-100%)
              </Typography>

              {Object.entries(parameters.weights).map(([key, value]) => (
                <Box key={key} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ minWidth: 150 }}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color={getWeightColor(value)}
                      sx={{ ml: 'auto', minWidth: 40 }}
                    >
                      {Math.round(value * 100)}%
                    </Typography>
                  </Box>
                  <Slider
                    value={value * 100}
                    onChange={(_, newValue) => handleWeightChange(key as keyof OptimizationWeights, newValue as number)}
                    min={0}
                    max={100}
                    step={5}
                    color={getWeightColor(value) as any}
                    sx={{ ml: 1, mr: 1 }}
                  />
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained">
          Start Optimization
        </Button>
      </DialogActions>
    </Dialog>
  );
};