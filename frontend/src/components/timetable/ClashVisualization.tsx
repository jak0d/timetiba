import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { Clash, ClashType, Severity } from '../../types/entities';

interface ClashVisualizationProps {
  clashes: Clash[];
  onClashClick?: (clash: Clash) => void;
  showResolutions?: boolean;
}

export const ClashVisualization: React.FC<ClashVisualizationProps> = ({
  clashes,
  onClashClick,
  showResolutions = true,
}) => {
  const theme = useTheme();
  const [expandedClashes, setExpandedClashes] = React.useState<Set<string>>(new Set());

  const toggleClashExpansion = (clashId: string) => {
    const newExpanded = new Set(expandedClashes);
    if (newExpanded.has(clashId)) {
      newExpanded.delete(clashId);
    } else {
      newExpanded.add(clashId);
    }
    setExpandedClashes(newExpanded);
  };

  const getSeverityIcon = (severity: Severity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'high':
        return <WarningIcon color="warning" />;
      case 'medium':
        return <InfoIcon color="info" />;
      case 'low':
        return <CheckCircleIcon color="success" />;
      default:
        return <InfoIcon />;
    }
  };

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'info';
    }
  };

  const getClashTypeLabel = (type: ClashType) => {
    switch (type) {
      case ClashType.VENUE_DOUBLE_BOOKING:
        return 'Venue Double Booking';
      case ClashType.LECTURER_CONFLICT:
        return 'Lecturer Conflict';
      case ClashType.STUDENT_GROUP_OVERLAP:
        return 'Student Group Overlap';
      case ClashType.EQUIPMENT_UNAVAILABLE:
        return 'Equipment Unavailable';
      case ClashType.CAPACITY_EXCEEDED:
        return 'Capacity Exceeded';
      default:
        return 'Unknown Clash';
    }
  };

  const groupedClashes = clashes.reduce((acc, clash) => {
    if (!acc[clash.severity]) {
      acc[clash.severity] = [];
    }
    acc[clash.severity].push(clash);
    return acc;
  }, {} as Record<Severity, Clash[]>);

  const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low'];

  if (clashes.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 2 }}>
        <Alert severity="success">
          <AlertTitle>No Clashes Detected</AlertTitle>
          The current timetable has no scheduling conflicts.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Scheduling Clashes ({clashes.length})
      </Typography>

      {severityOrder.map(severity => {
        const severityClashes = groupedClashes[severity];
        if (!severityClashes || severityClashes.length === 0) return null;

        return (
          <Box key={severity} sx={{ mb: 2 }}>
            <Alert 
              severity={getSeverityColor(severity) as any}
              sx={{ mb: 1 }}
            >
              <AlertTitle>
                {severity.charAt(0).toUpperCase() + severity.slice(1)} Priority 
                ({severityClashes.length})
              </AlertTitle>
            </Alert>

            <List dense>
              {severityClashes.map((clash) => {
                const isExpanded = expandedClashes.has(clash.id);
                
                return (
                  <React.Fragment key={clash.id}>
                    <ListItem
                      sx={{
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 1,
                        mb: 1,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: theme.palette.action.hover,
                        },
                      }}
                      onClick={() => onClashClick?.(clash)}
                    >
                      <ListItemIcon>
                        {getSeverityIcon(clash.severity)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">
                              {getClashTypeLabel(clash.type)}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${clash.affectedEntities.length} entities`}
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={clash.description}
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleClashExpansion(clash.id);
                        }}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </ListItem>

                    <Collapse in={isExpanded}>
                      <Box sx={{ ml: 4, mb: 2 }}>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          Affected Entities:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                          {clash.affectedEntities.map((entityId) => (
                            <Chip
                              key={entityId}
                              label={entityId}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>

                        {showResolutions && clash.suggestedResolutions.length > 0 && (
                          <>
                            <Typography variant="body2" fontWeight="bold" gutterBottom>
                              Suggested Resolutions:
                            </Typography>
                            <List dense>
                              {clash.suggestedResolutions.map((resolution, index) => (
                                <ListItem key={resolution.id} sx={{ pl: 0 }}>
                                  <ListItemText
                                    primary={
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2">
                                          {resolution.description}
                                        </Typography>
                                        <Chip
                                          size="small"
                                          label={`${Math.round(resolution.confidence * 100)}% confidence`}
                                          color={resolution.confidence > 0.8 ? 'success' : 
                                                resolution.confidence > 0.6 ? 'warning' : 'error'}
                                          variant="outlined"
                                        />
                                      </Box>
                                    }
                                    secondary={resolution.impact}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </>
                        )}
                      </Box>
                    </Collapse>
                  </React.Fragment>
                );
              })}
            </List>
          </Box>
        );
      })}
    </Paper>
  );
};