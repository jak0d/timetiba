import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Grid,
  IconButton,
  Collapse
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Cancel,
  Refresh,
  Download,
  ExpandMore,
  ExpandLess,
  PlayArrow,
  Pause,
  Stop
} from '@mui/icons-material';

interface ImportStage {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  details?: string[];
  errors?: string[];
}

interface ImportResult {
  summary: {
    totalProcessed: number;
    successful: number;
    failed: number;
    warnings: number;
  };
  entities: {
    venues: { created: number; updated: number; errors: number };
    lecturers: { created: number; updated: number; errors: number };
    courses: { created: number; updated: number; errors: number };
    schedules: { created: number; updated: number; errors: number };
  };
  errors: Array<{
    row: number;
    field: string;
    message: string;
    suggestion?: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

interface ImportProgressProps {
  jobId: string;
  stages: ImportStage[];
  currentStage: number;
  overallProgress: number;
  status: 'running' | 'completed' | 'error' | 'cancelled';
  result?: ImportResult;
  onCancel: () => void;
  onRetry: () => void;
  onDownloadReport: () => void;
  estimatedTimeRemaining?: number;
}

export const ImportProgressMonitor: React.FC<ImportProgressProps> = ({
  jobId,
  stages = [],
  currentStage,
  overallProgress = 0,
  status,
  result,
  onCancel,
  onRetry,
  onDownloadReport,
  estimatedTimeRemaining
}) => {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusIcon = (stageStatus: string) => {
    switch (stageStatus) {
      case 'completed': return <CheckCircle color="success" />;
      case 'error': return <Error color="error" />;
      case 'running': return <PlayArrow color="primary" />;
      default: return null;
    }
  };

  const getStatusColor = (stageStatus: string) => {
    switch (stageStatus) {
      case 'completed': return 'success';
      case 'error':
      case 'failed': return 'error';
      case 'running':
      case 'processing': return 'primary';
      case 'cancelled': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Import Progress
        </Typography>
        <Box>
          {status === 'running' && (
            <Button
              startIcon={<Cancel />}
              onClick={() => setCancelDialogOpen(true)}
              color="error"
              variant="outlined"
              sx={{ mr: 1 }}
            >
              Cancel
            </Button>
          )}
          {status === 'error' && (
            <Button
              startIcon={<Refresh />}
              onClick={onRetry}
              variant="outlined"
              sx={{ mr: 1 }}
            >
              Retry
            </Button>
          )}
          {(status === 'completed' || status === 'error') && result && (
            <Button
              startIcon={<Download />}
              onClick={onDownloadReport}
              variant="outlined"
            >
              Download Report
            </Button>
          )}
        </Box>
      </Box>

      {/* Overall Progress */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Overall Progress
            </Typography>
            <Chip
              label={status.charAt(0).toUpperCase() + status.slice(1)}
              color={getStatusColor(status)}
            />
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, overallProgress))}
            sx={{ height: 8, borderRadius: 4, mb: 2 }}
          />
          
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {Math.round(overallProgress)}% Complete
            </Typography>
            {estimatedTimeRemaining && status === 'running' && estimatedTimeRemaining > 0 && (
              <Typography variant="body2" color="text.secondary">
                Est. {formatDuration(estimatedTimeRemaining)} remaining
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Stage Progress */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Import Stages
          </Typography>
          
          {stages.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="text.secondary">
                Loading import stages...
              </Typography>
            </Box>
          ) : (
            <Stepper activeStep={Math.max(0, currentStage)} orientation="vertical">
            {stages.map((stage, index) => (
              <Step key={stage.id || `stage-${index}`}>
                <StepLabel
                  icon={getStatusIcon(stage.status)}
                  error={stage.status === 'error'}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                    <Typography variant="subtitle1">
                      {stage.name || `Stage ${index + 1}`}
                    </Typography>
                    {stage.status === 'running' && (
                      <Typography variant="body2" color="text.secondary">
                        {Math.round(stage.progress || 0)}%
                      </Typography>
                    )}
                  </Box>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {stage.description || `Processing ${stage.name || 'stage'}...`}
                  </Typography>
                  
                  {stage.status === 'running' && (
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, Math.max(0, stage.progress || 0))}
                      sx={{ mb: 2 }}
                    />
                  )}
                  
                  {stage.details && stage.details.length > 0 && (
                    <Box>
                      <Button
                        size="small"
                        onClick={() => toggleSection(`stage-${index}`)}
                        endIcon={expandedSections.has(`stage-${index}`) ? <ExpandLess /> : <ExpandMore />}
                      >
                        Details ({stage.details.length})
                      </Button>
                      <Collapse in={expandedSections.has(`stage-${index}`)}>
                        <List dense>
                          {stage.details.map((detail, detailIndex) => (
                            <ListItem key={detailIndex}>
                              <ListItemText primary={detail} />
                            </ListItem>
                          ))}
                        </List>
                      </Collapse>
                    </Box>
                  )}
                  
                  {stage.errors && stage.errors.length > 0 && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Errors in this stage ({stage.errors.length}):
                      </Typography>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {stage.errors.slice(0, 3).map((error, errorIndex) => (
                          <li key={errorIndex}>{error}</li>
                        ))}
                        {stage.errors.length > 3 && (
                          <li>... and {stage.errors.length - 3} more errors</li>
                        )}
                      </ul>
                    </Alert>
                  )}
                  
                  {stage.startTime && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      Started: {stage.startTime.toLocaleString()}
                      {stage.endTime && (
                        <> • Duration: {formatDuration(stage.endTime.getTime() - stage.startTime.getTime())}</>
                      )}
                    </Typography>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      {result && (status === 'completed' || status === 'error') && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Import Results
              </Typography>
              <Button
                size="small"
                onClick={() => setShowDetails(!showDetails)}
                endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
              >
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
            </Box>
            
            {/* Summary Cards */}
            <Grid container spacing={2} mb={2}>
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {result.summary.totalProcessed}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Processed
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {result.summary.successful}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Successful
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="error.main">
                      {result.summary.failed}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Failed
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {result.summary.warnings}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Warnings
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            <Collapse in={showDetails}>
              <Box>
                {/* Entity Results */}
                <Typography variant="subtitle1" gutterBottom>
                  Entity Results
                </Typography>
                <Grid container spacing={2} mb={3}>
                  {Object.entries(result.entities).map(([entityType, counts]) => (
                    <Grid item xs={12} sm={6} md={3} key={entityType}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>
                            {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
                          </Typography>
                          <Typography variant="body2" color="success.main">
                            Created: {counts.created}
                          </Typography>
                          <Typography variant="body2" color="info.main">
                            Updated: {counts.updated}
                          </Typography>
                          <Typography variant="body2" color="error.main">
                            Errors: {counts.errors}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                
                {/* Errors */}
                {result.errors.length > 0 && (
                  <Box mb={3}>
                    <Typography variant="subtitle1" gutterBottom>
                      Errors ({result.errors.length})
                    </Typography>
                    <List>
                      {result.errors.slice(0, 10).map((error, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <Error color="error" />
                          </ListItemIcon>
                          <ListItemText
                            primary={`Row ${error.row}: ${error.message}`}
                            secondary={error.suggestion}
                          />
                        </ListItem>
                      ))}
                    </List>
                    {result.errors.length > 10 && (
                      <Typography variant="body2" color="text.secondary">
                        ... and {result.errors.length - 10} more errors. Download the full report for details.
                      </Typography>
                    )}
                  </Box>
                )}
                
                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Warnings ({result.warnings.length})
                    </Typography>
                    <List>
                      {result.warnings.slice(0, 5).map((warning, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <Warning color="warning" />
                          </ListItemIcon>
                          <ListItemText
                            primary={`Row ${warning.row}: ${warning.message}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                    {result.warnings.length > 5 && (
                      <Typography variant="body2" color="text.secondary">
                        ... and {result.warnings.length - 5} more warnings. Download the full report for details.
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
      >
        <DialogTitle>Cancel Import</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this import? Any progress will be lost and you'll need to start over.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>
            Continue Import
          </Button>
          <Button
            onClick={() => {
              onCancel();
              setCancelDialogOpen(false);
            }}
            color="error"
          >
            Cancel Import
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};