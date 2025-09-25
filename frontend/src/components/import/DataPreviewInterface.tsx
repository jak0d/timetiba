import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
  Badge,
  IconButton,
  Tooltip,
  Collapse
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  ExpandMore,
  ExpandLess,
  Visibility,
  ThumbUp,
  ThumbDown,
  AutoFixHigh
} from '@mui/icons-material';

interface DataRow {
  id: string;
  data: Record<string, any>;
  validationResults: ValidationResult[];
  entityMatches: EntityMatch[];
}

interface ValidationResult {
  field: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

interface EntityMatch {
  type: 'venue' | 'lecturer' | 'course' | 'studentGroup';
  sourceValue: string;
  matches: MatchCandidate[];
  selectedMatch?: string;
  confidence: number;
}

interface MatchCandidate {
  id: string;
  name: string;
  confidence: number;
  details: Record<string, any>;
}

interface DataPreviewProps {
  data: DataRow[];
  columns: string[];
  validationSummary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
  entityMatchSummary: {
    totalMatches: number;
    highConfidenceMatches: number;
    lowConfidenceMatches: number;
    noMatches: number;
  };
  onEntityMatchApproval: (rowId: string, matchType: string, matchId: string) => void;
  onEntityMatchRejection: (rowId: string, matchType: string) => void;
  onBulkMatchApproval: (matchType: string, threshold: number) => void;
}

export const DataPreviewInterface: React.FC<DataPreviewProps> = ({
  data,
  columns,
  validationSummary,
  entityMatchSummary,
  onEntityMatchApproval,
  onEntityMatchRejection,
  onBulkMatchApproval
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedRow, setSelectedRow] = useState<DataRow | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<EntityMatch | null>(null);

  const filteredData = useMemo(() => {
    switch (selectedTab) {
      case 1: // Errors only
        return data.filter(row => row.validationResults.some(r => r.type === 'error'));
      case 2: // Warnings only
        return data.filter(row => row.validationResults.some(r => r.type === 'warning'));
      case 3: // Entity matches
        return data.filter(row => row.entityMatches.length > 0);
      default: // All data
        return data;
    }
  }, [data, selectedTab]);

  const toggleRowExpansion = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  const handleMatchReview = (match: EntityMatch) => {
    setSelectedMatch(match);
    setMatchDialogOpen(true);
  };

  const handleMatchApproval = (matchId: string) => {
    if (selectedMatch && selectedRow) {
      onEntityMatchApproval(selectedRow.id, selectedMatch.type, matchId);
      setMatchDialogOpen(false);
    }
  };

  const handleMatchRejection = () => {
    if (selectedMatch && selectedRow) {
      onEntityMatchRejection(selectedRow.id, selectedMatch.type);
      setMatchDialogOpen(false);
    }
  };

  const getValidationIcon = (type: string) => {
    switch (type) {
      case 'error': return <Error color="error" />;
      case 'warning': return <Warning color="warning" />;
      default: return <Info color="info" />;
    }
  };

  const getValidationColor = (type: string) => {
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'error';
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Data Preview & Validation
      </Typography>

      {/* Summary Cards */}
      <Box display="flex" gap={2} mb={3}>
        <Card>
          <CardContent>
            <Typography variant="h4" color="primary">
              {validationSummary.totalRows}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Rows
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Typography variant="h4" color="success.main">
              {validationSummary.validRows}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Valid Rows
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Typography variant="h4" color="error.main">
              {validationSummary.errorRows}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Error Rows
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Typography variant="h4" color="warning.main">
              {validationSummary.warningRows}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Warning Rows
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Entity Match Summary */}
      {entityMatchSummary.totalMatches > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Entity Matching Summary
          </Typography>
          <Box display="flex" gap={2}>
            <Chip 
              label={`${entityMatchSummary.highConfidenceMatches} High Confidence`} 
              color="success" 
              size="small" 
            />
            <Chip 
              label={`${entityMatchSummary.lowConfidenceMatches} Low Confidence`} 
              color="warning" 
              size="small" 
            />
            <Chip 
              label={`${entityMatchSummary.noMatches} No Matches`} 
              color="error" 
              size="small" 
            />
          </Box>
          <Box mt={2}>
            <Button
              startIcon={<AutoFixHigh />}
              onClick={() => onBulkMatchApproval('all', 80)}
              variant="outlined"
              size="small"
              sx={{ mr: 1 }}
            >
              Approve High Confidence
            </Button>
            <Button
              startIcon={<ThumbUp />}
              onClick={() => onBulkMatchApproval('venue', 70)}
              variant="outlined"
              size="small"
            >
              Approve Venue Matches
            </Button>
          </Box>
        </Alert>
      )}

      {/* Filter Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
          <Tab label="All Data" />
          <Tab 
            label={
              <Badge badgeContent={validationSummary.errorRows} color="error">
                Errors
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={validationSummary.warningRows} color="warning">
                Warnings
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={entityMatchSummary.totalMatches} color="info">
                Entity Matches
              </Badge>
            } 
          />
        </Tabs>
      </Box>

      {/* Data Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell>Status</TableCell>
              {columns.map(column => (
                <TableCell key={column}>{column}</TableCell>
              ))}
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((row) => (
              <React.Fragment key={row.id}>
                <TableRow>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => toggleRowExpansion(row.id)}
                    >
                      {expandedRows.has(row.id) ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      {row.validationResults.some(r => r.type === 'error') && (
                        <Chip icon={<Error />} label="Error" color="error" size="small" />
                      )}
                      {row.validationResults.some(r => r.type === 'warning') && (
                        <Chip icon={<Warning />} label="Warning" color="warning" size="small" />
                      )}
                      {row.entityMatches.length > 0 && (
                        <Chip label={`${row.entityMatches.length} Matches`} color="info" size="small" />
                      )}
                    </Box>
                  </TableCell>
                  {columns.map(column => (
                    <TableCell key={column}>
                      {row.data[column]}
                    </TableCell>
                  ))}
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => setSelectedRow(row)}
                    >
                      <Visibility />
                    </IconButton>
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell colSpan={columns.length + 3} sx={{ py: 0 }}>
                    <Collapse in={expandedRows.has(row.id)}>
                      <Box sx={{ py: 2 }}>
                        {/* Validation Results */}
                        {row.validationResults.length > 0 && (
                          <Box mb={2}>
                            <Typography variant="subtitle2" gutterBottom>
                              Validation Issues
                            </Typography>
                            <List dense>
                              {row.validationResults.map((result, index) => (
                                <ListItem key={index}>
                                  <ListItemIcon>
                                    {getValidationIcon(result.type)}
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={result.message}
                                    secondary={result.suggestion}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        )}
                        
                        {/* Entity Matches */}
                        {row.entityMatches.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Entity Matches
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={1}>
                              {row.entityMatches.map((match, index) => (
                                <Chip
                                  key={index}
                                  label={`${match.type}: ${match.sourceValue}`}
                                  color={getConfidenceColor(match.confidence)}
                                  onClick={() => {
                                    setSelectedRow(row);
                                    handleMatchReview(match);
                                  }}
                                  clickable
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Match Review Dialog */}
      <Dialog
        open={matchDialogOpen}
        onClose={() => setMatchDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Review Entity Match: {selectedMatch?.type}
        </DialogTitle>
        <DialogContent>
          {selectedMatch && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Source Value: {selectedMatch.sourceValue}
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Suggested Matches
              </Typography>
              
              <List>
                {selectedMatch.matches.map((candidate) => (
                  <ListItem
                    key={candidate.id}
                    button
                    onClick={() => handleMatchApproval(candidate.id)}
                  >
                    <ListItemText
                      primary={candidate.name}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            Confidence: {candidate.confidence}%
                          </Typography>
                          {Object.entries(candidate.details).map(([key, value]) => (
                            <Typography key={key} variant="caption" display="block">
                              {key}: {value}
                            </Typography>
                          ))}
                        </Box>
                      }
                    />
                    <Chip
                      label={`${candidate.confidence}%`}
                      color={getConfidenceColor(candidate.confidence)}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatchDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleMatchRejection} color="error">
            Reject All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};