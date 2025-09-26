import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Grid,
  Paper,
  Chip,
  Avatar,
  Stack,
  Fade,
  Zoom,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha
} from '@mui/material';
import {
  Psychology as AIIcon,
  CheckCircle as CheckIcon,
  School as CourseIcon,
  Person as LecturerIcon,
  Room as VenueIcon,
  Group as GroupIcon,
  Schedule as ScheduleIcon,
  AutoFixHigh as MagicIcon,
  Analytics as AnalyticsIcon,
  DataObject as DataIcon,
  Timeline as TimelineIcon,
  Insights as InsightsIcon,
  Celebration as CelebrationIcon,
  PlayArrow as PlayIcon,
  Close as CloseIcon
} from '@mui/icons-material';

interface AIImportDemoProps {
  open: boolean;
  onClose: () => void;
}

export const AIImportDemo: React.FC<AIImportDemoProps> = ({ open, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const theme = useTheme();

  const steps = [
    'Upload Sample Data',
    'AI Analysis',
    'Entity Detection',
    'Results Review'
  ];

  const sampleData = {
    venues: [
      { name: 'Room A-101', confidence: 95, attributes: { capacity: 30, building: 'A', floor: 1 } },
      { name: 'Lab B-202', confidence: 92, attributes: { capacity: 25, building: 'B', floor: 2 } },
      { name: 'Lecture Hall C', confidence: 98, attributes: { capacity: 150, building: 'C', floor: 1 } },
      { name: 'Computer Lab D-301', confidence: 89, attributes: { capacity: 40, building: 'D', floor: 3 } }
    ],
    lecturers: [
      { name: 'Dr. Sarah Smith', confidence: 96, attributes: { department: 'Mathematics', email: 'sarah.smith@uni.edu' } },
      { name: 'Prof. John Johnson', confidence: 94, attributes: { department: 'Physics', email: 'john.johnson@uni.edu' } },
      { name: 'Dr. Emily Brown', confidence: 91, attributes: { department: 'Computer Science', email: 'emily.brown@uni.edu' } },
      { name: 'Mr. David Wilson', confidence: 88, attributes: { department: 'Engineering', email: 'david.wilson@uni.edu' } }
    ],
    courses: [
      { name: 'Mathematics 101', confidence: 97, attributes: { code: 'MATH101', credits: 3, department: 'Mathematics' } },
      { name: 'Physics 201', confidence: 93, attributes: { code: 'PHYS201', credits: 4, department: 'Physics' } },
      { name: 'Computer Science Fundamentals', confidence: 95, attributes: { code: 'CS101', credits: 3, department: 'Computer Science' } },
      { name: 'Engineering Design', confidence: 90, attributes: { code: 'ENG201', credits: 4, department: 'Engineering' } }
    ],
    studentGroups: [
      { name: 'Computer Science Year 1', confidence: 94, attributes: { size: 45, year: 1, program: 'Computer Science' } },
      { name: 'Physics Year 2', confidence: 92, attributes: { size: 32, year: 2, program: 'Physics' } },
      { name: 'Mathematics Year 1', confidence: 96, attributes: { size: 38, year: 1, program: 'Mathematics' } },
      { name: 'Engineering Year 2', confidence: 89, attributes: { size: 28, year: 2, program: 'Engineering' } }
    ]
  };

  const processingStages = [
    { stage: 'Reading sample timetable data...', duration: 1500 },
    { stage: 'AI analyzing data patterns...', duration: 2000 },
    { stage: 'Detecting entities and relationships...', duration: 1800 },
    { stage: 'Validating results and confidence scores...', duration: 1200 }
  ];

  useEffect(() => {
    if (isProcessing) {
      runDemo();
    }
  }, [isProcessing]);

  const runDemo = async () => {
    setProgress(0);
    
    for (let i = 0; i < processingStages.length; i++) {
      const stage = processingStages[i];
      setProcessingStage(stage.stage);
      setProgress((i + 1) * 25);
      
      await new Promise(resolve => setTimeout(resolve, stage.duration));
    }
    
    setProgress(100);
    setProcessingStage('Analysis complete!');
    setCurrentStep(3);
    setShowResults(true);
    setIsProcessing(false);
  };

  const startDemo = () => {
    setCurrentStep(1);
    setIsProcessing(true);
    setShowResults(false);
  };

  const resetDemo = () => {
    setCurrentStep(0);
    setIsProcessing(false);
    setShowResults(false);
    setProgress(0);
    setProcessingStage('');
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'venues': return <VenueIcon />;
      case 'lecturers': return <LecturerIcon />;
      case 'courses': return <CourseIcon />;
      case 'studentGroups': return <GroupIcon />;
      default: return <CheckIcon />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'success';
    if (confidence >= 80) return 'warning';
    return 'error';
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AIIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">AI Import Demo</Typography>
          </Box>
          <Button onClick={onClose} color="inherit">
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Progress Stepper */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Step Content */}
        <Box sx={{ minHeight: 400 }}>
          {currentStep === 0 && (
            <Fade in timeout={600}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h5" sx={{ mb: 2 }}>
                  Experience AI-Powered Import
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
                  This demo shows how our AI processes a sample timetable file, detects entities, 
                  and preserves original names automatically.
                </Typography>
                
                {/* Sample Data Preview */}
                <Paper sx={{ p: 3, mb: 4, bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Sample Data Preview</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    CSV format with mixed timetable data:
                  </Typography>
                  <Box sx={{ 
                    fontFamily: 'monospace', 
                    fontSize: '0.875rem', 
                    bgcolor: 'background.paper', 
                    p: 2, 
                    borderRadius: 1,
                    textAlign: 'left',
                    overflow: 'auto'
                  }}>
                    Course Name,Lecturer Name,Venue,Day,Start Time,End Time,Student Group<br/>
                    Mathematics 101,Dr. Sarah Smith,Room A-101,Monday,09:00,10:30,Computer Science Year 1<br/>
                    Physics 201,Prof. John Johnson,Lab B-202,Tuesday,11:00,12:30,Physics Year 2<br/>
                    Computer Science Fundamentals,Dr. Emily Brown,Computer Lab D-301,Wednesday,14:00,15:30,Computer Science Year 1<br/>
                    ...
                  </Box>
                </Paper>

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayIcon />}
                  onClick={startDemo}
                  sx={{
                    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                    '&:hover': {
                      background: `linear-gradient(45deg, ${theme.palette.primary.dark} 30%, ${theme.palette.secondary.dark} 90%)`,
                    }
                  }}
                >
                  Start AI Analysis Demo
                </Button>
              </Box>
            </Fade>
          )}

          {(currentStep === 1 || currentStep === 2) && isProcessing && (
            <Fade in timeout={600}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ mb: 3 }}>
                  <CircularProgress size={80} thickness={4} />
                </Box>
                
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {processingStage}
                </Typography>
                
                <LinearProgress 
                  variant="determinate" 
                  value={progress} 
                  sx={{ mb: 3, height: 8, borderRadius: 4, maxWidth: 400, mx: 'auto' }}
                />

                {/* Processing Steps Visualization */}
                <Grid container spacing={2} sx={{ mt: 2, maxWidth: 800, mx: 'auto' }}>
                  {[
                    { icon: <DataIcon />, label: 'Reading File', active: progress >= 25 },
                    { icon: <AnalyticsIcon />, label: 'AI Analysis', active: progress >= 50 },
                    { icon: <TimelineIcon />, label: 'Entity Detection', active: progress >= 75 },
                    { icon: <CheckIcon />, label: 'Validation', active: progress >= 100 }
                  ].map((step, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                      <Card 
                        variant="outlined" 
                        sx={{ 
                          p: 2, 
                          textAlign: 'center',
                          bgcolor: step.active ? 'success.50' : 'grey.50',
                          borderColor: step.active ? 'success.main' : 'grey.300'
                        }}
                      >
                        <Box sx={{ 
                          color: step.active ? 'success.main' : 'grey.500',
                          mb: 1 
                        }}>
                          {step.icon}
                        </Box>
                        <Typography variant="subtitle2">
                          {step.label}
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Fade>
          )}

          {currentStep === 3 && showResults && (
            <Fade in timeout={600}>
              <Box>
                {/* Success Header */}
                <Zoom in timeout={800}>
                  <Paper sx={{ 
                    p: 3, 
                    mb: 3, 
                    background: 'linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)',
                    border: '2px solid',
                    borderColor: 'success.main',
                    textAlign: 'center'
                  }}>
                    <CelebrationIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="h5" color="success.main" sx={{ fontWeight: 600, mb: 1 }}>
                      AI Analysis Complete! 🎉
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Successfully detected and analyzed all entities with high confidence
                    </Typography>
                  </Paper>
                </Zoom>

                {/* Entity Summary Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {Object.entries(sampleData).map(([type, entities], index) => (
                    <Grid item xs={12} sm={6} md={3} key={type}>
                      <Card 
                        variant="outlined" 
                        sx={{ 
                          height: '100%',
                          textAlign: 'center',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 4,
                            borderColor: 'primary.main'
                          }
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
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
                            {entities.length}
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {Math.round(entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length)}% avg confidence
                          </Typography>
                          <Chip 
                            label="Ready to import" 
                            color="success" 
                            size="small" 
                            sx={{ mt: 1 }} 
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {/* Detailed Results */}
                <Typography variant="h6" sx={{ mb: 2 }}>Detected Entities Preview</Typography>
                {Object.entries(sampleData).map(([type, entities]) => (
                  <Paper key={type} sx={{ mb: 2, overflow: 'hidden' }}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'grey.50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ color: 'primary.main', mr: 2 }}>
                          {getEntityIcon(type)}
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {type.charAt(0).toUpperCase() + type.slice(1)} ({entities.length})
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={`${Math.round(entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length)}% avg`}
                        color="success"
                      />
                    </Box>
                    <List dense>
                      {entities.slice(0, 3).map((entity, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <Chip
                              size="small"
                              label={`${entity.confidence}%`}
                              color={getConfidenceColor(entity.confidence)}
                              variant="outlined"
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={entity.name}
                            secondary={`Attributes: ${Object.keys(entity.attributes).join(', ')}`}
                          />
                        </ListItem>
                      ))}
                      {entities.length > 3 && (
                        <ListItem>
                          <ListItemText
                            primary={`... and ${entities.length - 3} more entities`}
                            sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Paper>
                ))}
              </Box>
            </Fade>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="outlined">
          Close Demo
        </Button>
        {currentStep === 3 && (
          <Button onClick={resetDemo} variant="outlined" sx={{ mr: 2 }}>
            Run Again
          </Button>
        )}
        {currentStep === 0 && (
          <Button 
            onClick={startDemo} 
            variant="contained"
            startIcon={<MagicIcon />}
          >
            Start Demo
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};