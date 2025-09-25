import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Chip,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  Psychology as AIIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  School as CourseIcon,
  Person as LecturerIcon,
  Room as VenueIcon,
  Group as GroupIcon,
  Schedule as ScheduleIcon,
  AutoFixHigh as MagicIcon
} from '@mui/icons-material';
import { useImportStore } from '../../store/importStore';
import { importApi } from '../../services/importApi';

interface LLMAnalysisResult {
  detectedEntities: {
    venues: DetectedEntity[];
    lecturers: DetectedEntity[];
    courses: DetectedEntity[];
    studentGroups: DetectedEntity[];
    schedules: DetectedScheduleEntry[];
  };
  suggestedMappings: any[];
  dataStructure: any;
  confidence: number;
  recommendations: string[];
}

interface DetectedEntity {
  originalName: string;
  normalizedName: string;
  attributes: Record<string, any>;
  confidence: number;
  sourceRows: number[];
  suggestedFields: Record<string, any>;
}

interface DetectedScheduleEntry {
  course: string;
  lecturer: string;
  venue: string;
  studentGroups: string[];
  timeSlot: {
    day: string;
    startTime: string;
    endTime: string;
  };
  originalRow: number;
  confidence: number;
}

interface LLMImportInterfaceProps {
  fileId: string;
  onComplete: (result: any) => void;
  onCancel: () => void;
}

export const LLMImportInterface: React.FC<LLMImportInterfaceProps> = ({
  fileId,
  onComplete,
  onCancel
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<LLMAnalysisResult | null>(null);
  const [isCreatingEntities, setIsCreatingEntities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preserveOriginalNames, setPreserveOriginalNames] = useState(true);
  const [createMissingEntities, setCreateMissingEntities] = useState(true);

  const { setProgress, setCurrentStage } = useImportStore();

  const handleLLMProcessing = useCallback(async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setCurrentStage('AI Analysis');
      setProgress(10);

      const options = {
        preserveOriginalNames,
        createMissingEntities,
        confidenceThreshold: 0.7,
        maxRetries: 3,
        enableContextualMapping: true
      };

      setProgress(30);
      const response = await importApi.processWithLLM(fileId, options);
      
      if (response.success) {
        setAnalysisResult(response.data.analysis);
        setProgress(100);
        setCurrentStage('Analysis Complete');
      } else {
        throw new Error(response.message || 'LLM processing failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'LLM processing failed');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  }, [fileId, preserveOriginalNames, createMissingEntities, setProgress, setCurrentStage]);

  const handleCreateEntities = useCallback(async () => {
    if (!analysisResult) return;

    try {
      setIsCreatingEntities(true);
      setError(null);
      setCurrentStage('Creating Entities');
      setProgress(10);

      const options = {
        preserveOriginalNames,
        createMissingEntities
      };

      setProgress(50);
      const response = await importApi.createEntitiesFromLLM(analysisResult, options);
      
      if (response.success) {
        setProgress(100);
        setCurrentStage('Import Complete');
        onComplete(response.data);
      } else {
        throw new Error(response.message || 'Entity creation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Entity creation failed');
      setProgress(0);
    } finally {
      setIsCreatingEntities(false);
    }
  }, [analysisResult, preserveOriginalNames, createMissingEntities, onComplete, setProgress, setCurrentStage]);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'venues': return <VenueIcon />;
      case 'lecturers': return <LecturerIcon />;
      case 'courses': return <CourseIcon />;
      case 'studentGroups': return <GroupIcon />;
      case 'schedules': return <ScheduleIcon />;
      default: return <CheckIcon />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <AIIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h5" component="h2">
              AI-Powered Import Analysis
            </Typography>
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Our AI will analyze your data to automatically detect entities, preserve original names, 
            and create intelligent mappings for seamless integration.
          </Typography>

          {/* Processing Options */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Processing Options</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preserveOriginalNames}
                      onChange={(e) => setPreserveOriginalNames(e.target.checked)}
                      disabled={isProcessing || isCreatingEntities}
                    />
                  }
                  label="Preserve Original Names"
                />
                <Typography variant="caption" display="block" color="text.secondary">
                  Keep the exact names from your data for familiarity
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={createMissingEntities}
                      onChange={(e) => setCreateMissingEntities(e.target.checked)}
                      disabled={isProcessing || isCreatingEntities}
                    />
                  }
                  label="Create Missing Entities"
                />
                <Typography variant="caption" display="block" color="text.secondary">
                  Automatically create new entities found in your data
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Processing Progress */}
          {(isProcessing || isCreatingEntities) && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {isProcessing ? 'Analyzing data with AI...' : 'Creating entities...'}
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Start Analysis Button */}
          {!analysisResult && !isProcessing && (
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<MagicIcon />}
                onClick={handleLLMProcessing}
                sx={{ minWidth: 200 }}
              >
                Start AI Analysis
              </Button>
            </Box>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <Box>
              {/* Overall Confidence */}
              <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Analysis Complete</Typography>
                  <Chip
                    label={`${Math.round(analysisResult.confidence * 100)}% Confidence`}
                    color={getConfidenceColor(analysisResult.confidence)}
                    variant="filled"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  AI has successfully analyzed your data and detected the following entities
                </Typography>
              </Paper>

              {/* Detected Entities Summary */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {Object.entries(analysisResult.detectedEntities).map(([type, entities]) => (
                  <Grid item xs={12} sm={6} md={4} key={type}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        {getEntityIcon(type)}
                        <Typography variant="h4" sx={{ mt: 1 }}>
                          {Array.isArray(entities) ? entities.length : 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Detailed Entity Information */}
              {Object.entries(analysisResult.detectedEntities).map(([type, entities]) => {
                if (!Array.isArray(entities) || entities.length === 0) return null;
                
                return (
                  <Accordion key={type} sx={{ mb: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getEntityIcon(type)}
                        <Typography sx={{ ml: 1 }}>
                          {type.charAt(0).toUpperCase() + type.slice(1)} ({entities.length})
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {entities.slice(0, 10).map((entity: any, index: number) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Chip
                                size="small"
                                label={`${Math.round(entity.confidence * 100)}%`}
                                color={getConfidenceColor(entity.confidence)}
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={entity.originalName}
                              secondary={
                                entity.normalizedName !== entity.originalName 
                                  ? `Normalized: ${entity.normalizedName}` 
                                  : `From rows: ${entity.sourceRows?.join(', ')}`
                              }
                            />
                          </ListItem>
                        ))}
                        {entities.length > 10 && (
                          <ListItem>
                            <ListItemText
                              primary={`... and ${entities.length - 10} more`}
                              sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                            />
                          </ListItem>
                        )}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                );
              })}

              {/* Recommendations */}
              {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: 'warning.50' }}>
                  <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <WarningIcon sx={{ mr: 1 }} />
                    Recommendations
                  </Typography>
                  <List dense>
                    {analysisResult.recommendations.map((rec, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={rec} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  disabled={isCreatingEntities}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleCreateEntities}
                  disabled={isCreatingEntities}
                  startIcon={<CheckIcon />}
                >
                  {isCreatingEntities ? 'Creating Entities...' : 'Create Entities'}
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};