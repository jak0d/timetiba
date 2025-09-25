import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Visibility as ViewIcon,
  Psychology as AIIcon,
} from '@mui/icons-material';
import { 
  ConflictResolutionSuggestion, 
  SuggestionChange, 
  EffortLevel 
} from '../../types/ai';

interface ConflictResolutionSuggestionsProps {
  suggestions: ConflictResolutionSuggestion[];
  onApplySuggestion: (suggestionId: string) => void;
  onRejectSuggestion: (suggestionId: string) => void;
  loading?: boolean;
}

export const ConflictResolutionSuggestions: React.FC<ConflictResolutionSuggestionsProps> = ({
  suggestions,
  onApplySuggestion,
  onRejectSuggestion,
  loading = false,
}) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<ConflictResolutionSuggestion | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getEffortColor = (effort: EffortLevel) => {
    switch (effort) {
      case EffortLevel.LOW:
        return 'success';
      case EffortLevel.MEDIUM:
        return 'warning';
      case EffortLevel.HIGH:
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'error';
    if (priority >= 6) return 'warning';
    if (priority >= 4) return 'info';
    return 'success';
  };

  const handleViewDetails = (suggestion: ConflictResolutionSuggestion) => {
    setSelectedSuggestion(suggestion);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedSuggestion(null);
  };

  const formatChangeDescription = (change: SuggestionChange) => {
    const entityName = change.entityId.split('-').pop() || change.entityId;
    switch (change.changeType) {
      case 'move':
        return `Move ${change.entityType} ${entityName} to ${change.proposedValue}`;
      case 'reschedule':
        return `Reschedule ${change.entityType} ${entityName} from ${change.currentValue} to ${change.proposedValue}`;
      case 'reassign':
        return `Reassign ${change.entityType} ${entityName} from ${change.currentValue} to ${change.proposedValue}`;
      case 'swap':
        return `Swap ${change.entityType} ${entityName} with ${change.proposedValue}`;
      default:
        return `Update ${change.entityType} ${entityName}`;
    }
  };

  if (suggestions.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AIIcon sx={{ mr: 1 }} />
          <Typography variant="h6">AI Suggestions</Typography>
        </Box>
        <Alert severity="info">
          No conflict resolution suggestions available. The AI will generate suggestions when clashes are detected.
        </Alert>
      </Paper>
    );
  }

  // Sort suggestions by priority (descending) and confidence (descending)
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return b.confidence - a.confidence;
  });

  return (
    <>
      <Paper elevation={1} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AIIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            AI Conflict Resolution Suggestions ({suggestions.length})
          </Typography>
        </Box>

        <List>
          {sortedSuggestions.map((suggestion, index) => (
            <Accordion key={suggestion.id} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mr: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      {suggestion.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Chip
                        size="small"
                        label={`${Math.round(suggestion.confidence * 100)}% confidence`}
                        color={getConfidenceColor(suggestion.confidence)}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={`Priority: ${suggestion.priority}/10`}
                        color={getPriorityColor(suggestion.priority)}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={`${suggestion.estimatedEffort} effort`}
                        color={getEffortColor(suggestion.estimatedEffort)}
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {suggestion.description}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      <strong>Impact:</strong> {suggestion.impact}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'success.main' }}>
                      Pros:
                    </Typography>
                    <List dense>
                      {suggestion.pros.map((pro, idx) => (
                        <ListItem key={idx} sx={{ py: 0, pl: 0 }}>
                          <ListItemText
                            primary={`• ${pro}`}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'error.main' }}>
                      Cons:
                    </Typography>
                    <List dense>
                      {suggestion.cons.map((con, idx) => (
                        <ListItem key={idx} sx={{ py: 0, pl: 0 }}>
                          <ListItemText
                            primary={`• ${con}`}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Required Changes ({suggestion.changes.length}):
                    </Typography>
                    <List dense>
                      {suggestion.changes.slice(0, 3).map((change, idx) => (
                        <ListItem key={idx} sx={{ py: 0.5, pl: 0 }}>
                          <ListItemText
                            primary={formatChangeDescription(change)}
                            secondary={change.reason}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                      {suggestion.changes.length > 3 && (
                        <ListItem sx={{ py: 0, pl: 0 }}>
                          <ListItemText
                            primary={`... and ${suggestion.changes.length - 3} more changes`}
                            primaryTypographyProps={{ variant: 'body2', fontStyle: 'italic' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleViewDetails(suggestion)}
                      >
                        View Details
                      </Button>
                      <Button
                        size="small"
                        startIcon={<CancelIcon />}
                        onClick={() => onRejectSuggestion(suggestion.id)}
                        disabled={loading}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => onApplySuggestion(suggestion.id)}
                        disabled={loading}
                      >
                        Apply Suggestion
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </List>
      </Paper>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Suggestion Details: {selectedSuggestion?.title}
        </DialogTitle>
        <DialogContent>
          {selectedSuggestion && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedSuggestion.description}
              </Typography>

              <Typography variant="h6" sx={{ mb: 1 }}>
                All Required Changes:
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Entity</TableCell>
                      <TableCell>Change Type</TableCell>
                      <TableCell>From</TableCell>
                      <TableCell>To</TableCell>
                      <TableCell>Reason</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedSuggestion.changes.map((change, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {change.entityType} {change.entityId.split('-').pop()}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={change.changeType} />
                        </TableCell>
                        <TableCell>{String(change.currentValue)}</TableCell>
                        <TableCell>{String(change.proposedValue)}</TableCell>
                        <TableCell>{change.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Affected Entities:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selectedSuggestion.affectedEntities.map((entityId) => (
                    <Chip
                      key={entityId}
                      label={entityId}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
          {selectedSuggestion && (
            <>
              <Button
                startIcon={<CancelIcon />}
                onClick={() => {
                  onRejectSuggestion(selectedSuggestion.id);
                  handleCloseDetails();
                }}
                disabled={loading}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                onClick={() => {
                  onApplySuggestion(selectedSuggestion.id);
                  handleCloseDetails();
                }}
                disabled={loading}
              >
                Apply Suggestion
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};