import React, { useState, useCallback, useEffect } from 'react';
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
  Divider,
  Fade,
  Slide,
  CircularProgress,
  Tooltip,
  IconButton,
  Collapse,
  Avatar,
  Stack,
  Skeleton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Zoom,
  Grow
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
  AutoFixHigh as MagicIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  SmartToy as SmartToyIcon,
  Close as CloseIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  Visibility as PreviewIcon,
  Analytics as AnalyticsIcon,
  AutoAwesome as SparkleIcon,
  Lightbulb as LightbulbIcon,
  DataObject as DataIcon,
  Timeline as TimelineIcon,
  Insights as InsightsIcon,
  PlayCircle as PlayIcon,
  PauseCircle as PauseIcon,
  Settings as SettingsIcon,
  HelpOutline as HelpIcon,
  Celebration as CelebrationIcon
} from '@mui/icons-material';
import { useImportStore } from '../../store/importStore';
import { importApi } from '../../services/importApi';
import { FileAnalysisDisplay } from './FileAnalysisDisplay';

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
  fileData?: {
    id: string;
    filename: string;
    size: number;
    metadata: {
      rows: number;
      columns: string[];
      preview: Record<string, any>[];
    };
  };
  onComplete: (result: any) => void;
  onCancel: () => void;
}

export const LLMImportInterface: React.FC<LLMImportInterfaceProps> = ({
  fileId,
  fileData,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<LLMAnalysisResult | null>(null);
  const [isCreatingEntities, setIsCreatingEntities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preserveOriginalNames, setPreserveOriginalNames] = useState(true);
  const [createMissingEntities, setCreateMissingEntities] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  const { setProgress, setCurrentStage } = useImportStore();

  const steps = [
    {
      label: 'Configure AI Analysis',
      description: 'Set your preferences for how AI should process your data',
      icon: <SettingsIcon />
    },
    {
      label: 'AI Processing',
      description: 'AI analyzes your data structure and detects entities',
      icon: <AIIcon />
    },
    {
      label: 'Review Results',
      description: 'Review detected entities and AI recommendations',
      icon: <PreviewIcon />
    },
    {
      label: 'Create Entities',
      description: 'Import entities into your timetable system',
      icon: <PlayIcon />
    }
  ];

  // Auto-expand sections with detected entities
  useEffect(() => {
    if (analysisResult) {
      const newExpanded: Record<string, boolean> = {};
      Object.entries(analysisResult.detectedEntities).forEach(([type, entities]) => {
        if (Array.isArray(entities) && entities.length > 0) {
          newExpanded[type] = true;
        }
      });
      setExpandedSections(newExpanded);
    }
  }, [analysisResult]);

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

      // Enhanced processing stages with animations
      const stages = [
        { stage: 'Reading file structure...', progress: 20, step: 0 },
        { stage: 'AI analyzing data patterns...', progress: 40, step: 1 },
        { stage: 'Detecting entities and relationships...', progress: 60, step: 2 },
        { stage: 'Finalizing analysis and validation...', progress: 80, step: 3 }
      ];

      for (const { stage, progress, step } of stages) {
        setProcessingStage(stage);
        setProgress(progress);
        setAnimationStep(step);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      const response = await importApi.processWithLLM(fileId, options);
      
      if (response.success) {
        setAnalysisResult(response.data.analysis);
        setProgress(100);
        setCurrentStage('Analysis Complete');
        setProcessingStage('');
        setAnimationStep(4);
        setCurrentStep(2);
        setShowCelebration(true);
      } else {
        throw new Error(response.message || 'LLM processing failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'LLM processing failed');
      setProgress(0);
      setProcessingStage('');
      setCurrentStep(0);
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

      // Enhanced entity creation stages
      const creationStages = [
        { stage: 'Creating venues...', progress: 25, step: 0 },
        { stage: 'Creating lecturers...', progress: 50, step: 1 },
        { stage: 'Creating courses and groups...', progress: 75, step: 2 },
        { stage: 'Finalizing import...', progress: 90, step: 3 }
      ];

      for (const { stage, progress, step } of creationStages) {
        setProcessingStage(stage);
        setProgress(progress);
        setAnimationStep(step);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const response = await importApi.createEntitiesFromLLM(analysisResult, options);
      
      if (response.success) {
        setProgress(100);
        setCurrentStage('Import Complete');
        setProcessingStage('');
        setAnimationStep(4);
        await new Promise(resolve => setTimeout(resolve, 500));
        onComplete(response.data);
      } else {
        throw new Error(response.message || 'Entity creation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Entity creation failed');
      setProgress(0);
      setProcessingStage('');
      setCurrentStep(2); // Go back to review step
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
    <Container maxWidth="lg">
      <Box sx={{ py: 2 }}>
        {/* Header with Animation */}
        <Fade in timeout={800}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
              <Zoom in timeout={1000}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: 'primary.main',
                    mr: 2,
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  }}
                >
                  <SparkleIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Zoom>
              <Box>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
                  AI-Powered Smart Import
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Let AI intelligently process your timetable data
                </Typography>
              </Box>
            </Box>
            
            {/* Benefits Chips */}
            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" sx={{ gap: 1 }}>
              <Chip icon={<SpeedIcon />} label="10x Faster" color="primary" variant="outlined" />
              <Chip icon={<SecurityIcon />} label="Preserves Names" color="success" variant="outlined" />
              <Chip icon={<InsightsIcon />} label="Smart Detection" color="info" variant="outlined" />
            </Stack>
          </Box>
        </Fade>

        {/* File Information Display */}
        {fileData && (
          <Grow in timeout={1200}>
            <Box sx={{ mb: 3 }}>
              <FileAnalysisDisplay 
                fileData={fileData}
                showDetailed={false}
              />
            </Box>
          </Grow>
        )}

        {!fileData && (
          <Grow in timeout={1200}>
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.main' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DataIcon sx={{ mr: 2, color: 'info.main' }} />
                <Typography variant="h6" color="info.main">
                  Ready to Analyze Your File
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                File ID: <code>{fileId}</code>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your file has been successfully uploaded and is ready for AI analysis. 
                The AI will examine the structure, detect entities, and create intelligent mappings 
                while preserving your original naming conventions.
              </Typography>
            </Paper>
          </Grow>
        )}

        {/* Progress Stepper */}
        <Grow in timeout={1200}>
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
            <Stepper activeStep={currentStep} orientation="horizontal" alternativeLabel>
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel icon={step.icon}>
                    <Typography variant="subtitle2">{step.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {step.description}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>
        </Grow>

        {/* Step Content */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {currentStep === 0 && (
              <Fade in timeout={600}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <SettingsIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h6">Configure AI Analysis</Typography>
                  </Box>
                  
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    Customize how our AI processes your data. These settings ensure the import matches your preferences.
                  </Typography>

                  {/* Processing Options with Enhanced UI */}
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ p: 3, height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                          <SecurityIcon sx={{ mr: 2, color: 'success.main', mt: 0.5 }} />
                          <Box sx={{ flex: 1 }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={preserveOriginalNames}
                                  onChange={(e) => setPreserveOriginalNames(e.target.checked)}
                                  disabled={isProcessing || isCreatingEntities}
                                  color="success"
                                />
                              }
                              label={
                                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                  Preserve Original Names
                                </Typography>
                              }
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              Keep the exact names from your data for familiarity. Your users will see the same 
                              terminology they're used to.
                            </Typography>
                            <Chip 
                              label="Recommended" 
                              size="small" 
                              color="success" 
                              variant="outlined" 
                              sx={{ mt: 1 }} 
                            />
                          </Box>
                        </Box>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ p: 3, height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                          <MagicIcon sx={{ mr: 2, color: 'primary.main', mt: 0.5 }} />
                          <Box sx={{ flex: 1 }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={createMissingEntities}
                                  onChange={(e) => setCreateMissingEntities(e.target.checked)}
                                  disabled={isProcessing || isCreatingEntities}
                                  color="primary"
                                />
                              }
                              label={
                                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                  Create Missing Entities
                                </Typography>
                              }
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              Automatically create new venues, lecturers, courses, and groups found in your data. 
                              Saves manual setup time.
                            </Typography>
                            <Chip 
                              label="Smart" 
                              size="small" 
                              color="primary" 
                              variant="outlined" 
                              sx={{ mt: 1 }} 
                            />
                          </Box>
                        </Box>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Advanced Options */}
                  <Box sx={{ mt: 4 }}>
                    <Button
                      variant="text"
                      startIcon={showAdvancedOptions ? <ArrowUpIcon /> : <ArrowDownIcon />}
                      onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                      sx={{ mb: 2 }}
                    >
                      Advanced Options
                    </Button>
                    
                    <Collapse in={showAdvancedOptions}>
                      <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                          Advanced Processing Settings
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          • Confidence threshold: 70% (entities below this threshold will be flagged for review)
                          • Context analysis: Enabled (AI will understand relationships between entities)
                          • Retry attempts: 3 (automatic retries for failed API calls)
                          • Batch processing: Optimized for your file size
                        </Typography>
                      </Paper>
                    </Collapse>
                  </Box>

                  <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<AIIcon />}
                      onClick={() => {
                        setCurrentStep(1);
                        handleLLMProcessing();
                      }}
                      sx={{ 
                        minWidth: 200,
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #1976D2 30%, #0288D1 90%)',
                        }
                      }}
                    >
                      Start AI Analysis
                    </Button>
                  </Box>
                </Box>
              </Fade>
            )}

            {currentStep === 1 && (
              <Fade in timeout={600}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <AIIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h6">AI Processing Your Data</Typography>
                  </Box>

                  {/* Animated Processing Steps */}
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                      Our AI is analyzing your data structure, detecting entities, and creating intelligent mappings.
                    </Typography>

                    {/* Processing Animation */}
                    <Box sx={{ position: 'relative', mb: 4 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                        <Box sx={{ position: 'relative' }}>
                          <CircularProgress
                            size={80}
                            thickness={4}
                            sx={{ color: 'primary.main' }}
                          />
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              bottom: 0,
                              right: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <AIIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                          </Box>
                        </Box>
                      </Box>

                      {/* Processing Stages */}
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          {processingStage || 'Initializing AI analysis...'}
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={animationStep * 25} 
                          sx={{ mb: 2, height: 8, borderRadius: 4 }}
                        />
                      </Box>

                      {/* Processing Steps Visualization */}
                      <Grid container spacing={2} sx={{ mt: 2 }}>
                        {[
                          { icon: <DataIcon />, label: 'Reading File', desc: 'Parsing data structure' },
                          { icon: <AnalyticsIcon />, label: 'AI Analysis', desc: 'Detecting entities' },
                          { icon: <TimelineIcon />, label: 'Mapping', desc: 'Creating relationships' },
                          { icon: <CheckIcon />, label: 'Validation', desc: 'Ensuring accuracy' }
                        ].map((step, index) => (
                          <Grid item xs={12} sm={6} md={3} key={index}>
                            <Card 
                              variant="outlined" 
                              sx={{ 
                                p: 2, 
                                textAlign: 'center',
                                bgcolor: animationStep > index ? 'success.50' : 'grey.50',
                                borderColor: animationStep > index ? 'success.main' : 'grey.300'
                              }}
                            >
                              <Box sx={{ 
                                color: animationStep > index ? 'success.main' : 'grey.500',
                                mb: 1 
                              }}>
                                {step.icon}
                              </Box>
                              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                                {step.label}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {step.desc}
                              </Typography>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>

                    {/* Fun Facts During Processing */}
                    <Paper sx={{ p: 3, bgcolor: 'info.50', borderLeft: 4, borderColor: 'info.main' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <LightbulbIcon sx={{ mr: 1, color: 'info.main' }} />
                        <Typography variant="subtitle2" color="info.main">
                          Did you know?
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Our AI can detect over 50 different timetable formats and automatically preserve 
                        your original naming conventions, making the transition seamless for your users.
                      </Typography>
                    </Paper>
                  </Box>
                </Box>
              </Fade>
            )}

            {currentStep === 2 && analysisResult && (
              <Fade in timeout={600}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <PreviewIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h6">Review AI Analysis Results</Typography>
                  </Box>

                  {/* Success Header with Celebration */}
                  <Zoom in timeout={800}>
                    <Paper sx={{ 
                      p: 3, 
                      mb: 3, 
                      background: 'linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)',
                      border: '2px solid',
                      borderColor: 'success.main'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CelebrationIcon sx={{ mr: 2, color: 'success.main', fontSize: 32 }} />
                          <Box>
                            <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                              Analysis Complete! 🎉
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              AI successfully analyzed your data with high confidence
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={`${Math.round(analysisResult.confidence * 100)}% Confidence`}
                          color={getConfidenceColor(analysisResult.confidence)}
                          variant="filled"
                          sx={{ fontSize: '1rem', height: 40, fontWeight: 600 }}
                        />
                      </Box>
                    </Paper>
                  </Zoom>

                  {/* Enhanced Entity Summary Cards */}
                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    {Object.entries(analysisResult.detectedEntities).map(([type, entities], index) => (
                      <Grid item xs={12} sm={6} md={4} key={type}>
                        <Grow in timeout={800 + index * 200}>
                          <Card 
                            variant="outlined" 
                            sx={{ 
                              height: '100%',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 4,
                                borderColor: 'primary.main'
                              }
                            }}
                          >
                            <CardContent sx={{ textAlign: 'center', p: 3 }}>
                              <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                mb: 2,
                                color: 'primary.main'
                              }}>
                                {getEntityIcon(type)}
                              </Box>
                              <Typography variant="h3" sx={{ 
                                fontWeight: 700, 
                                color: 'primary.main',
                                mb: 1 
                              }}>
                                {Array.isArray(entities) ? entities.length : 0}
                              </Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {Array.isArray(entities) && entities.length > 0 
                                  ? `Detected with ${Math.round(entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length * 100)}% avg confidence`
                                  : 'No entities found'
                                }
                              </Typography>
                              {Array.isArray(entities) && entities.length > 0 && (
                                <Chip 
                                  label="Ready to import" 
                                  color="success" 
                                  size="small" 
                                  sx={{ mt: 1 }} 
                                />
                              )}
                            </CardContent>
                          </Card>
                        </Grow>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Quick Preview Button */}
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Button
                      variant="outlined"
                      startIcon={<PreviewIcon />}
                      onClick={() => setShowPreview(!showPreview)}
                      sx={{ mr: 2 }}
                    >
                      {showPreview ? 'Hide Details' : 'Preview Detected Entities'}
                    </Button>
                    <Tooltip title="View detailed breakdown of detected entities">
                      <IconButton size="small">
                        <HelpIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Detailed Entity Information with Enhanced UI */}
                  <Collapse in={showPreview}>
                    <Box sx={{ mb: 3 }}>
                      {Object.entries(analysisResult.detectedEntities).map(([type, entities]) => {
                        if (!Array.isArray(entities) || entities.length === 0) return null;
                        
                        return (
                          <Accordion 
                            key={type} 
                            sx={{ 
                              mb: 2,
                              '&:before': { display: 'none' },
                              boxShadow: 1
                            }}
                            defaultExpanded={entities.length <= 5}
                          >
                            <AccordionSummary 
                              expandIcon={<ExpandMoreIcon />}
                              sx={{ 
                                bgcolor: 'grey.50',
                                '&:hover': { bgcolor: 'grey.100' }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                <Box sx={{ color: 'primary.main', mr: 2 }}>
                                  {getEntityIcon(type)}
                                </Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 500, flex: 1 }}>
                                  {type.charAt(0).toUpperCase() + type.slice(1)} ({entities.length})
                                </Typography>
                                <Chip
                                  size="small"
                                  label={`${Math.round(entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length * 100)}% avg`}
                                  color={getConfidenceColor(entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length)}
                                />
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 0 }}>
                              <List dense>
                                {entities.slice(0, 10).map((entity: any, index: number) => (
                                  <ListItem 
                                    key={index}
                                    sx={{ 
                                      borderBottom: index < Math.min(entities.length, 10) - 1 ? '1px solid' : 'none',
                                      borderColor: 'divider'
                                    }}
                                  >
                                    <ListItemIcon>
                                      <Chip
                                        size="small"
                                        label={`${Math.round(entity.confidence * 100)}%`}
                                        color={getConfidenceColor(entity.confidence)}
                                        variant="outlined"
                                      />
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={
                                        <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                                          {entity.originalName}
                                        </Typography>
                                      }
                                      secondary={
                                        <Box>
                                          {entity.normalizedName !== entity.originalName && (
                                            <Typography variant="caption" color="text.secondary" display="block">
                                              Normalized: {entity.normalizedName}
                                            </Typography>
                                          )}
                                          <Typography variant="caption" color="text.secondary">
                                            Found in rows: {entity.sourceRows?.join(', ')}
                                          </Typography>
                                        </Box>
                                      }
                                    />
                                  </ListItem>
                                ))}
                                {entities.length > 10 && (
                                  <ListItem sx={{ bgcolor: 'grey.50' }}>
                                    <ListItemText
                                      primary={
                                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                          ... and {entities.length - 10} more entities
                                        </Typography>
                                      }
                                    />
                                  </ListItem>
                                )}
                              </List>
                            </AccordionDetails>
                          </Accordion>
                        );
                      })}
                    </Box>
                  </Collapse>

                  {/* AI Recommendations */}
                  {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                    <Paper sx={{ 
                      p: 3, 
                      mb: 3, 
                      bgcolor: 'warning.50',
                      border: '1px solid',
                      borderColor: 'warning.main',
                      borderRadius: 2
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <LightbulbIcon sx={{ mr: 2, color: 'warning.main' }} />
                        <Typography variant="h6" color="warning.main" sx={{ fontWeight: 600 }}>
                          AI Recommendations
                        </Typography>
                      </Box>
                      <List dense>
                        {analysisResult.recommendations.map((rec, index) => (
                          <ListItem key={index} sx={{ pl: 0 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary={
                                <Typography variant="body2" color="text.primary">
                                  {rec}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  )}

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={onCancel}
                      disabled={isCreatingEntities}
                      sx={{ minWidth: 120 }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => {
                        setCurrentStep(3);
                        handleCreateEntities();
                      }}
                      disabled={isCreatingEntities}
                      startIcon={<PlayIcon />}
                      sx={{ 
                        minWidth: 200,
                        background: 'linear-gradient(45deg, #4CAF50 30%, #66BB6A 90%)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #388E3C 30%, #4CAF50 90%)',
                        }
                      }}
                    >
                      Create Entities
                    </Button>
                  </Box>
                </Box>
              </Fade>
            )}

            {currentStep === 3 && (
              <Fade in timeout={600}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <PlayIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h6">Creating Entities</Typography>
                  </Box>

                  {isCreatingEntities ? (
                    <Box sx={{ textAlign: 'center' }}>
                      <Box sx={{ mb: 3 }}>
                        <CircularProgress size={60} thickness={4} />
                      </Box>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        {processingStage || 'Creating entities...'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Please wait while we create your entities in the system
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={animationStep * 25} 
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center' }}>
                      <Zoom in timeout={800}>
                        <CelebrationIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                      </Zoom>
                      <Typography variant="h4" sx={{ fontWeight: 600, mb: 2, color: 'success.main' }}>
                        Import Complete! 🎉
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        All entities have been successfully created and imported into your timetable system.
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button
                          variant="outlined"
                          size="large"
                          onClick={onCancel}
                          sx={{ minWidth: 120 }}
                        >
                          Close
                        </Button>
                        <Button
                          variant="contained"
                          size="large"
                          onClick={() => window.location.href = '/timetables'}
                          sx={{ minWidth: 200 }}
                        >
                          View Timetables
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Fade>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Slide in direction="up" timeout={500}>
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              action={
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={() => setError(null)}
                >
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              }
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Processing Error
              </Typography>
              <Typography variant="body2">
                {error}
              </Typography>
            </Alert>
          </Slide>
        )}
      </Box>
    </Container>
  );
};