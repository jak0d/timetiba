import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Paper,
  Chip,
  Avatar,
  Stack,
  Fade,
  Zoom,
  useTheme,
  alpha
} from '@mui/material';
import {
  Psychology as AIIcon,
  AutoFixHigh as MagicIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Insights as InsightsIcon,
  CloudUpload as UploadIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckIcon,
  TrendingUp as TrendingUpIcon,
  AutoAwesome as SparkleIcon,
  School as CourseIcon,
  Person as LecturerIcon,
  Room as VenueIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { ImportWorkflow } from '../components/import/ImportWorkflow';
import { AIImportDemo } from '../components/import/AIImportDemo';

const AIImport: React.FC = () => {
  const [showImportWorkflow, setShowImportWorkflow] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const theme = useTheme();

  const features = [
    {
      icon: <SpeedIcon />,
      title: '10x Faster Import',
      description: 'Skip manual column mapping and let AI handle everything automatically',
      color: 'primary'
    },
    {
      icon: <SecurityIcon />,
      title: 'Preserves Your Names',
      description: 'Keep the exact terminology your team is familiar with',
      color: 'success'
    },
    {
      icon: <InsightsIcon />,
      title: 'Smart Detection',
      description: 'AI understands relationships between entities automatically',
      color: 'info'
    },
    {
      icon: <MagicIcon />,
      title: 'Zero Configuration',
      description: 'Works with any timetable format out of the box',
      color: 'warning'
    }
  ];

  const steps = [
    {
      icon: <UploadIcon />,
      title: 'Upload Your File',
      description: 'Drop your CSV or Excel file containing timetable data'
    },
    {
      icon: <AIIcon />,
      title: 'AI Analysis',
      description: 'Our AI analyzes structure and detects all entities'
    },
    {
      icon: <CheckIcon />,
      title: 'Review & Import',
      description: 'Review detected entities and import with one click'
    }
  ];

  const entityTypes = [
    { icon: <VenueIcon />, name: 'Venues', description: 'Rooms, labs, halls' },
    { icon: <LecturerIcon />, name: 'Lecturers', description: 'Teaching staff' },
    { icon: <CourseIcon />, name: 'Courses', description: 'Subjects, modules' },
    { icon: <GroupIcon />, name: 'Groups', description: 'Student cohorts' }
  ];

  if (showImportWorkflow) {
    return <ImportWorkflow />;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 6 }}>
        {/* Hero Section */}
        <Fade in timeout={800}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Zoom in timeout={1000}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 3,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                }}
              >
                <SparkleIcon sx={{ fontSize: 40 }} />
              </Avatar>
            </Zoom>
            
            <Typography variant="h2" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
              AI-Powered Smart Import
            </Typography>
            
            <Typography variant="h5" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              Transform your timetable data import with artificial intelligence. 
              Upload any format and let AI handle the rest.
            </Typography>

            {/* Key Benefits */}
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" sx={{ gap: 2, mb: 4 }}>
              <Chip 
                icon={<SpeedIcon />} 
                label="10x Faster" 
                color="primary" 
                variant="filled" 
                size="large"
              />
              <Chip 
                icon={<SecurityIcon />} 
                label="Preserves Names" 
                color="success" 
                variant="filled" 
                size="large"
              />
              <Chip 
                icon={<InsightsIcon />} 
                label="Smart Detection" 
                color="info" 
                variant="filled" 
                size="large"
              />
            </Stack>

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                startIcon={<MagicIcon />}
                onClick={() => setShowImportWorkflow(true)}
                sx={{
                  fontSize: '1.2rem',
                  py: 2,
                  px: 4,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                  '&:hover': {
                    background: `linear-gradient(45deg, ${theme.palette.primary.dark} 30%, ${theme.palette.secondary.dark} 90%)`,
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[8],
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Start AI Import
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                startIcon={<TrendingUpIcon />}
                onClick={() => setShowDemo(true)}
                sx={{
                  fontSize: '1.1rem',
                  py: 2,
                  px: 3,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[4],
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                View Demo
              </Button>
            </Stack>
          </Box>
        </Fade>

        {/* Features Grid */}
        <Grid container spacing={4} sx={{ mb: 8 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Fade in timeout={1000 + index * 200}>
                <Card
                  sx={{
                    height: '100%',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: theme.shadows[12],
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        mx: 'auto',
                        mb: 2,
                        bgcolor: `${feature.color}.main`,
                      }}
                    >
                      {feature.icon}
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>

        {/* How It Works */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h3" component="h2" sx={{ textAlign: 'center', fontWeight: 600, mb: 6 }}>
            How It Works
          </Typography>
          
          <Grid container spacing={4} alignItems="center">
            {steps.map((step, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Fade in timeout={1200 + index * 300}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Paper
                      sx={{
                        width: 80,
                        height: 80,
                        mx: 'auto',
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        border: `2px solid ${theme.palette.primary.main}`,
                      }}
                    >
                      <Box sx={{ color: 'primary.main', fontSize: 32 }}>
                        {step.icon}
                      </Box>
                    </Paper>
                    
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {step.title}
                    </Typography>
                    
                    <Typography variant="body1" color="text.secondary">
                      {step.description}
                    </Typography>
                  </Box>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Supported Entities */}
        <Paper sx={{ p: 4, mb: 8, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
          <Typography variant="h4" component="h2" sx={{ textAlign: 'center', fontWeight: 600, mb: 4 }}>
            Automatically Detects All Entity Types
          </Typography>
          
          <Grid container spacing={3}>
            {entityTypes.map((entity, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Fade in timeout={1400 + index * 200}>
                  <Box
                    sx={{
                      textAlign: 'center',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        transform: 'scale(1.05)',
                      },
                    }}
                  >
                    <Box sx={{ color: 'primary.main', mb: 1, fontSize: 32 }}>
                      {entity.icon}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {entity.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {entity.description}
                    </Typography>
                  </Box>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Stats Section */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h4" component="h2" sx={{ fontWeight: 600, mb: 4 }}>
            Trusted by Educational Institutions
          </Typography>
          
          <Grid container spacing={4}>
            {[
              { number: '50+', label: 'File Formats Supported' },
              { number: '95%', label: 'Average Accuracy' },
              { number: '10x', label: 'Faster Than Manual' },
              { number: '100%', label: 'Name Preservation' }
            ].map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Fade in timeout={1600 + index * 200}>
                  <Box>
                    <Typography variant="h2" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                      {stat.number}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Box>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* CTA Section */}
        <Fade in timeout={2000}>
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
              border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <Typography variant="h4" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
              Ready to Transform Your Import Process?
            </Typography>
            
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              Join thousands of educators who have streamlined their timetable management with AI
            </Typography>
            
            <Button
              variant="contained"
              size="large"
              startIcon={<AIIcon />}
              onClick={() => setShowImportWorkflow(true)}
              sx={{
                fontSize: '1.1rem',
                py: 2,
                px: 4,
                background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                '&:hover': {
                  background: `linear-gradient(45deg, ${theme.palette.primary.dark} 30%, ${theme.palette.secondary.dark} 90%)`,
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[8],
                },
                transition: 'all 0.3s ease',
              }}
            >
              Get Started with AI Import
            </Button>
          </Paper>
        </Fade>

        {/* Demo Dialog */}
        <AIImportDemo 
          open={showDemo} 
          onClose={() => setShowDemo(false)} 
        />
      </Box>
    </Container>
  );
};

export default AIImport;