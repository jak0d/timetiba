import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Grid,
  Alert,
  LinearProgress,
  Tooltip,
  Avatar,
  Stack,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Psychology as AIIcon,
  TableChart as ManualIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface ImportRecord {
  id: string;
  filename: string;
  fileSize: number;
  uploadedAt: Date;
  importedAt?: Date;
  status: 'uploaded' | 'processing' | 'completed' | 'failed' | 'cancelled';
  method: 'manual' | 'ai';
  progress: number;
  recordsProcessed: number;
  totalRecords: number;
  entitiesCreated: {
    venues: number;
    lecturers: number;
    courses: number;
    studentGroups: number;
    schedules: number;
  };
  errors: string[];
  warnings: string[];
  user: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

export const ImportHistory: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [importRecords, setImportRecords] = useState<ImportRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ImportRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedRecord, setSelectedRecord] = useState<ImportRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const mockRecords: ImportRecord[] = [
      {
        id: '1',
        filename: 'spring_2024_timetable.csv',
        fileSize: 2048576,
        uploadedAt: new Date('2024-01-15T10:30:00'),
        importedAt: new Date('2024-01-15T10:35:00'),
        status: 'completed',
        method: 'ai',
        progress: 100,
        recordsProcessed: 450,
        totalRecords: 450,
        entitiesCreated: {
          venues: 25,
          lecturers: 15,
          courses: 35,
          studentGroups: 12,
          schedules: 450
        },
        errors: [],
        warnings: ['2 duplicate venue names found and merged'],
        user: 'admin@university.edu'
      },
      {
        id: '2',
        filename: 'fall_2023_schedule.xlsx',
        fileSize: 1536000,
        uploadedAt: new Date('2024-01-10T14:20:00'),
        importedAt: new Date('2024-01-10T14:45:00'),
        status: 'completed',
        method: 'manual',
        progress: 100,
        recordsProcessed: 320,
        totalRecords: 325,
        entitiesCreated: {
          venues: 18,
          lecturers: 12,
          courses: 28,
          studentGroups: 8,
          schedules: 320
        },
        errors: ['5 records failed validation'],
        warnings: [],
        user: 'scheduler@university.edu'
      },
      {
        id: '3',
        filename: 'summer_2024_courses.csv',
        fileSize: 512000,
        uploadedAt: new Date('2024-01-12T09:15:00'),
        status: 'processing',
        method: 'ai',
        progress: 65,
        recordsProcessed: 130,
        totalRecords: 200,
        entitiesCreated: {
          venues: 0,
          lecturers: 0,
          courses: 0,
          studentGroups: 0,
          schedules: 0
        },
        errors: [],
        warnings: [],
        user: 'admin@university.edu'
      },
      {
        id: '4',
        filename: 'winter_2024_labs.xlsx',
        fileSize: 768000,
        uploadedAt: new Date('2024-01-08T16:45:00'),
        status: 'failed',
        method: 'manual',
        progress: 25,
        recordsProcessed: 0,
        totalRecords: 150,
        entitiesCreated: {
          venues: 0,
          lecturers: 0,
          courses: 0,
          studentGroups: 0,
          schedules: 0
        },
        errors: ['Invalid file format', 'Missing required columns'],
        warnings: [],
        user: 'scheduler@university.edu'
      }
    ];
    
    setImportRecords(mockRecords);
    setFilteredRecords(mockRecords);
  }, []);

  // Filter records based on search and filters
  useEffect(() => {
    let filtered = importRecords;

    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.user.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    if (methodFilter !== 'all') {
      filtered = filtered.filter(record => record.method === methodFilter);
    }

    setFilteredRecords(filtered);
  }, [importRecords, searchTerm, statusFilter, methodFilter]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusColor = (status: ImportRecord['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'warning';
      case 'cancelled': return 'default';
      default: return 'info';
    }
  };

  const getStatusIcon = (status: ImportRecord['status']) => {
    switch (status) {
      case 'completed': return <SuccessIcon />;
      case 'failed': return <ErrorIcon />;
      case 'processing': return <PendingIcon />;
      default: return <FileIcon />;
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, record: ImportRecord) => {
    setMenuAnchor(event.currentTarget);
    setSelectedRecord(record);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedRecord(null);
  };

  const handleView = () => {
    setViewDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleDeleteConfirm = () => {
    if (selectedRecord) {
      setImportRecords(prev => prev.filter(r => r.id !== selectedRecord.id));
    }
    setDeleteDialogOpen(false);
    setSelectedRecord(null);
  };

  const handleDownload = () => {
    // Implement download functionality
    console.log('Download report for:', selectedRecord?.filename);
    setMenuAnchor(null);
  };

  const getTotalStats = () => {
    const completed = importRecords.filter(r => r.status === 'completed');
    return {
      totalImports: importRecords.length,
      successfulImports: completed.length,
      totalRecords: completed.reduce((sum, r) => sum + r.recordsProcessed, 0),
      aiImports: importRecords.filter(r => r.method === 'ai').length,
      manualImports: importRecords.filter(r => r.method === 'manual').length
    };
  };

  const stats = getTotalStats();

  return (
    <Container maxWidth="lg">
      <Box py={4}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Import Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your file imports and view import history
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/import')}
            size="large"
          >
            New Import
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main">
                  {stats.totalImports}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Imports
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {stats.successfulImports}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Successful
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {stats.totalRecords.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Records Processed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main">
                  {stats.aiImports}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  AI Imports
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {stats.manualImports}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manual Imports
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="All Imports" />
            <Tab label="Active Jobs" />
            <Tab label="Failed Imports" />
          </Tabs>
        </Paper>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search files or users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="processing">Processing</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Method</InputLabel>
                  <Select
                    value={methodFilter}
                    label="Method"
                    onChange={(e) => setMethodFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Methods</MenuItem>
                    <MenuItem value="ai">AI Import</MenuItem>
                    <MenuItem value="manual">Manual Import</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setMethodFilter('all');
                  }}
                >
                  Reset
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          {/* All Imports Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>File</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Records</TableCell>
                  <TableCell>Uploaded</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          <FileIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {record.filename}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(record.fileSize)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(record.status)}
                        label={record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        color={getStatusColor(record.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={record.method === 'ai' ? <AIIcon /> : <ManualIcon />}
                        label={record.method === 'ai' ? 'AI Import' : 'Manual'}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={record.progress}
                          sx={{ width: 60, height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption">
                          {record.progress}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {record.recordsProcessed.toLocaleString()} / {record.totalRecords.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(record.uploadedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {record.user}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => handleMenuClick(e, record)}
                      >
                        <MoreIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Active Jobs */}
          <Alert severity="info" sx={{ mb: 2 }}>
            Showing currently processing import jobs
          </Alert>
          {/* Filter for processing jobs */}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Failed Imports */}
          <Alert severity="warning" sx={{ mb: 2 }}>
            Showing failed import attempts that may need attention
          </Alert>
          {/* Filter for failed jobs */}
        </TabPanel>

        {/* Action Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleView}>
            <ViewIcon sx={{ mr: 1 }} />
            View Details
          </MenuItem>
          <MenuItem onClick={handleDownload}>
            <DownloadIcon sx={{ mr: 1 }} />
            Download Report
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete Record
          </MenuItem>
        </Menu>

        {/* View Details Dialog */}
        <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Import Details</DialogTitle>
          <DialogContent>
            {selectedRecord && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {selectedRecord.filename}
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Chip
                      icon={getStatusIcon(selectedRecord.status)}
                      label={selectedRecord.status}
                      color={getStatusColor(selectedRecord.status)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Method</Typography>
                    <Chip
                      icon={selectedRecord.method === 'ai' ? <AIIcon /> : <ManualIcon />}
                      label={selectedRecord.method === 'ai' ? 'AI Import' : 'Manual'}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>

                {selectedRecord.status === 'completed' && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Entities Created
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2">
                          Venues: {selectedRecord.entitiesCreated.venues}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2">
                          Lecturers: {selectedRecord.entitiesCreated.lecturers}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2">
                          Courses: {selectedRecord.entitiesCreated.courses}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2">
                          Schedules: {selectedRecord.entitiesCreated.schedules}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {selectedRecord.errors.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="error.main" gutterBottom>
                      Errors
                    </Typography>
                    {selectedRecord.errors.map((error, index) => (
                      <Alert key={index} severity="error" sx={{ mb: 1 }}>
                        {error}
                      </Alert>
                    ))}
                  </Box>
                )}

                {selectedRecord.warnings.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="warning.main" gutterBottom>
                      Warnings
                    </Typography>
                    {selectedRecord.warnings.map((warning, index) => (
                      <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                        {warning}
                      </Alert>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Import Record</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this import record? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ImportHistory;