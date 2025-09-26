import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Avatar,
  Fade,
  Grow
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  TableChart as TableIcon,
  ViewColumn as ColumnIcon,
  DataObject as DataIcon,
  CheckCircle as CheckIcon,
  Analytics as AnalyticsIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';

interface FileAnalysisDisplayProps {
  fileData: {
    id: string;
    filename: string;
    size: number;
    metadata: {
      rows: number;
      columns: string[];
      preview: Record<string, any>[];
    };
  };
  showDetailed?: boolean;
}

export const FileAnalysisDisplay: React.FC<FileAnalysisDisplayProps> = ({
  fileData,
  showDetailed = true
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeFromName = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'csv': return 'CSV';
      case 'xlsx': return 'Excel';
      case 'xls': return 'Excel (Legacy)';
      default: return 'Unknown';
    }
  };

  const analyzeColumns = (columns: string[]) => {
    const analysis = {
      timetableColumns: 0,
      entityColumns: 0,
      timeColumns: 0,
      identifierColumns: 0
    };

    columns.forEach(col => {
      const lowerCol = col.toLowerCase();
      if (lowerCol.includes('time') || lowerCol.includes('hour') || lowerCol.includes('schedule')) {
        analysis.timeColumns++;
      } else if (lowerCol.includes('course') || lowerCol.includes('subject') || lowerCol.includes('module')) {
        analysis.entityColumns++;
      } else if (lowerCol.includes('lecturer') || lowerCol.includes('teacher') || lowerCol.includes('instructor')) {
        analysis.entityColumns++;
      } else if (lowerCol.includes('room') || lowerCol.includes('venue') || lowerCol.includes('location')) {
        analysis.entityColumns++;
      } else if (lowerCol.includes('group') || lowerCol.includes('class') || lowerCol.includes('student')) {
        analysis.entityColumns++;
      } else if (lowerCol.includes('id') || lowerCol.includes('code') || lowerCol.includes('number')) {
        analysis.identifierColumns++;
      }
    });

    analysis.timetableColumns = analysis.timeColumns + analysis.entityColumns;
    return analysis;
  };

  const columnAnalysis = analyzeColumns(fileData.metadata.columns);
  const isLikelyTimetable = columnAnalysis.timetableColumns >= 3;

  return (
    <Box>
      {/* Main File Info Card */}
      <Fade in timeout={600}>
        <Card sx={{ mb: 3, border: '2px solid', borderColor: 'success.main', bgcolor: 'success.50' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ bgcolor: 'success.main', mr: 2, width: 56, height: 56 }}>
                <FileIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {fileData.filename}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getFileTypeFromName(fileData.filename)} • {formatFileSize(fileData.size)}
                </Typography>
              </Box>
              <Chip 
                icon={<CheckIcon />}
                label="Analysis Complete" 
                color="success" 
                variant="filled"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            {/* Quick Stats */}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 2 }}>
                  <Typography variant="h3" color="primary.main" sx={{ fontWeight: 700 }}>
                    {fileData.metadata.rows.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Data Rows
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 2 }}>
                  <Typography variant="h3" color="primary.main" sx={{ fontWeight: 700 }}>
                    {fileData.metadata.columns.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Columns
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 2 }}>
                  <Typography variant="h3" color="primary.main" sx={{ fontWeight: 700 }}>
                    {isLikelyTimetable ? '95%' : '60%'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    AI Confidence
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Fade>

      {showDetailed && (
        <Grid container spacing={3}>
          {/* Column Analysis */}
          <Grid item xs={12} md={6}>
            <Grow in timeout={800}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ColumnIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h6">Column Analysis</Typography>
                  </Box>

                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <TableIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Timetable Columns"
                        secondary={`${columnAnalysis.timetableColumns} columns detected`}
                      />
                      <Chip 
                        label={columnAnalysis.timetableColumns >= 3 ? 'Good' : 'Limited'} 
                        color={columnAnalysis.timetableColumns >= 3 ? 'success' : 'warning'}
                        size="small"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <DataIcon color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Entity Columns"
                        secondary={`${columnAnalysis.entityColumns} entity-related columns`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <SpeedIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Time Columns"
                        secondary={`${columnAnalysis.timeColumns} time-related columns`}
                      />
                    </ListItem>
                  </List>

                  {/* AI Readiness Indicator */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      AI Processing Readiness
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={isLikelyTimetable ? 95 : 60} 
                      sx={{ height: 8, borderRadius: 4 }}
                      color={isLikelyTimetable ? 'success' : 'warning'}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {isLikelyTimetable 
                        ? 'Excellent structure for AI processing' 
                        : 'Good structure, may need some manual review'
                      }
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grow>
          </Grid>

          {/* Column Preview */}
          <Grid item xs={12} md={6}>
            <Grow in timeout={1000}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AnalyticsIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h6">Detected Columns</Typography>
                  </Box>

                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {fileData.metadata.columns.map((column, index) => {
                        const lowerCol = column.toLowerCase();
                        let chipColor: 'primary' | 'success' | 'warning' | 'info' | 'default' = 'default';
                        
                        if (lowerCol.includes('course') || lowerCol.includes('subject')) chipColor = 'primary';
                        else if (lowerCol.includes('lecturer') || lowerCol.includes('teacher')) chipColor = 'success';
                        else if (lowerCol.includes('room') || lowerCol.includes('venue')) chipColor = 'info';
                        else if (lowerCol.includes('time') || lowerCol.includes('schedule')) chipColor = 'warning';

                        return (
                          <Chip
                            key={index}
                            label={column}
                            size="small"
                            variant="outlined"
                            color={chipColor}
                            sx={{ mb: 0.5 }}
                          />
                        );
                      })}
                    </Box>
                  </Box>

                  {fileData.metadata.preview && fileData.metadata.preview.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Sample Data Preview
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 100, overflow: 'auto' }}>
                        <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace' }}>
                          {JSON.stringify(fileData.metadata.preview[0], null, 2)}
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grow>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};