import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
  LinearProgress,
  Alert,
  Fade,
  Collapse,
  Avatar,
  Divider,
  Stack
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Refresh as ReplaceIcon,
  MoreVert as MoreIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Visibility as PreviewIcon,
  Info as InfoIcon,
  CloudUpload as UploadIcon,
  FolderOpen as FolderIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface FileData {
  id: string;
  filename: string;
  size: number;
  status: 'uploading' | 'analyzing' | 'ready' | 'error' | 'processing';
  progress: number;
  uploadedAt: Date;
  metadata?: {
    rows: number;
    columns: string[];
    preview: Record<string, any>[];
    fileType: string;
    encoding?: string;
  };
  error?: string;
  analysisResult?: {
    confidence: number;
    entityTypes: string[];
    recommendations: string[];
  };
}

interface FileManagerProps {
  files: FileData[];
  onFileUpload: (file: File) => Promise<void>;
  onFileDelete: (fileId: string) => void;
  onFileReplace: (fileId: string, newFile: File) => Promise<void>;
  onFileSelect: (fileId: string) => void;
  selectedFileId?: string;
  maxFiles?: number;
  acceptedFormats?: string[];
  maxSize?: number;
}

export const FileManager: React.FC<FileManagerProps> = ({
  files,
  onFileUpload,
  onFileDelete,
  onFileReplace,
  onFileSelect,
  selectedFileId,
  maxFiles = 5,
  acceptedFormats = ['.csv', '.xlsx', '.xls'],
  maxSize = 10 * 1024 * 1024
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuFileId, setMenuFileId] = useState<string | null>(null);
  const [replaceFileId, setReplaceFileId] = useState<string | null>(null);
  const [showFileDetails, setShowFileDetails] = useState<Record<string, boolean>>({});

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusColor = (status: FileData['status']) => {
    switch (status) {
      case 'ready': return 'success';
      case 'error': return 'error';
      case 'uploading': case 'analyzing': case 'processing': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: FileData['status']) => {
    switch (status) {
      case 'ready': return <SuccessIcon color="success" />;
      case 'error': return <ErrorIcon color="error" />;
      case 'uploading': case 'analyzing': case 'processing': return <PendingIcon color="warning" />;
      default: return <FileIcon />;
    }
  };

  const getStatusText = (status: FileData['status']) => {
    switch (status) {
      case 'uploading': return 'Uploading...';
      case 'analyzing': return 'Analyzing...';
      case 'processing': return 'Processing...';
      case 'ready': return 'Ready';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  // Dropzone for new file uploads
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (files.length >= maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    for (const file of acceptedFiles.slice(0, maxFiles - files.length)) {
      try {
        await onFileUpload(file);
      } catch (error) {
        console.error('File upload failed:', error);
      }
    }
  }, [files.length, maxFiles, onFileUpload]);

  // Dropzone for file replacement
  const onReplaceDrop = useCallback(async (acceptedFiles: File[]) => {
    if (replaceFileId && acceptedFiles.length > 0) {
      try {
        await onFileReplace(replaceFileId, acceptedFiles[0]);
        setReplaceFileId(null);
      } catch (error) {
        console.error('File replacement failed:', error);
      }
    }
  }, [replaceFileId, onFileReplace]);

  const { getRootProps: getUploadProps, getInputProps: getUploadInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFormats.reduce((acc, format) => {
      acc[`application/${format.slice(1)}`] = [format];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize,
    multiple: true,
    disabled: files.length >= maxFiles
  });

  const { getRootProps: getReplaceProps, getInputProps: getReplaceInputProps, isDragActive: isReplaceDragActive } = useDropzone({
    onDrop: onReplaceDrop,
    accept: acceptedFormats.reduce((acc, format) => {
      acc[`application/${format.slice(1)}`] = [format];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize,
    multiple: false
  });

  const handleDeleteClick = (fileId: string) => {
    setFileToDelete(fileId);
    setDeleteDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleDeleteConfirm = () => {
    if (fileToDelete) {
      onFileDelete(fileToDelete);
      setFileToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, fileId: string) => {
    setMenuAnchor(event.currentTarget);
    setMenuFileId(fileId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuFileId(null);
  };

  const handleReplaceClick = (fileId: string) => {
    setReplaceFileId(fileId);
    setMenuAnchor(null);
  };

  const handleDownload = (file: FileData) => {
    // Create a download link for the file
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMenuAnchor(null);
  };

  const toggleFileDetails = (fileId: string) => {
    setShowFileDetails(prev => ({
      ...prev,
      [fileId]: !prev[fileId]
    }));
  };

  return (
    <Box>
      {/* Upload Area */}
      {files.length < maxFiles && (
        <Card
          {...getUploadProps()}
          sx={{
            mb: 3,
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover'
            }
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <input {...getUploadInputProps()} />
            <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive
                ? 'Drop files here...'
                : files.length === 0
                ? 'Upload your first file'
                : `Add more files (${files.length}/${maxFiles})`
              }
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supported: {acceptedFormats.join(', ')} • Max: {formatFileSize(maxSize)}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* File Replacement Dropzone */}
      {replaceFileId && (
        <Card
          {...getReplaceProps()}
          sx={{
            mb: 3,
            border: '2px dashed',
            borderColor: isReplaceDragActive ? 'warning.main' : 'warning.light',
            backgroundColor: isReplaceDragActive ? 'warning.50' : 'warning.25',
            cursor: 'pointer'
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <input {...getReplaceInputProps()} />
            <ReplaceIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
            <Typography variant="h6" color="warning.main">
              Drop new file to replace
            </Typography>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => setReplaceFileId(null)}
              sx={{ mt: 1 }}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <FolderIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">
                Uploaded Files ({files.length}/{maxFiles})
              </Typography>
            </Box>

            <List>
              {files.map((file, index) => (
                <Box key={file.id}>
                  <ListItem
                    sx={{
                      border: selectedFileId === file.id ? '2px solid' : '1px solid',
                      borderColor: selectedFileId === file.id ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: selectedFileId === file.id ? 'primary.50' : 'background.paper',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: selectedFileId === file.id ? 'primary.100' : 'action.hover'
                      }
                    }}
                    onClick={() => onFileSelect(file.id)}
                  >
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {getStatusIcon(file.status)}
                      </Avatar>
                    </ListItemIcon>

                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {file.filename}
                          </Typography>
                          <Chip
                            label={getStatusText(file.status)}
                            color={getStatusColor(file.status)}
                            size="small"
                          />
                          {selectedFileId === file.id && (
                            <Chip label="Selected" color="primary" size="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {formatFileSize(file.size)} • Uploaded {formatDate(file.uploadedAt)}
                          </Typography>
                          
                          {file.status === 'uploading' && (
                            <Box sx={{ mt: 1 }}>
                              <LinearProgress variant="determinate" value={file.progress} />
                              <Typography variant="caption" color="text.secondary">
                                {file.progress}% uploaded
                              </Typography>
                            </Box>
                          )}

                          {file.status === 'error' && file.error && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                              {file.error}
                            </Alert>
                          )}

                          {file.metadata && (
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              <Chip
                                label={`${file.metadata.rows} rows`}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={`${file.metadata.columns.length} columns`}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={file.metadata.fileType}
                                size="small"
                                variant="outlined"
                              />
                            </Stack>
                          )}
                        </Box>
                      }
                    />

                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip title="View details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFileDetails(file.id);
                            }}
                          >
                            <InfoIcon />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="More actions">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMenuClick(e, file.id);
                            }}
                          >
                            <MoreIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>

                  {/* File Details Collapse */}
                  <Collapse in={showFileDetails[file.id]}>
                    <Card variant="outlined" sx={{ ml: 7, mr: 2, mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                          File Details
                        </Typography>
                        
                        {file.metadata && (
                          <Box>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Columns:</strong> {file.metadata.columns.join(', ')}
                            </Typography>
                            
                            {file.metadata.encoding && (
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Encoding:</strong> {file.metadata.encoding}
                              </Typography>
                            )}

                            {file.analysisResult && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>AI Analysis:</strong> {file.analysisResult.confidence}% confidence
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>Detected Entities:</strong> {file.analysisResult.entityTypes.join(', ')}
                                </Typography>
                              </Box>
                            )}

                            {file.metadata.preview && file.metadata.preview.length > 0 && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>Sample Data:</strong>
                                </Typography>
                                <Box sx={{ 
                                  bgcolor: 'grey.100', 
                                  p: 1, 
                                  borderRadius: 1, 
                                  fontFamily: 'monospace',
                                  fontSize: '0.75rem',
                                  overflow: 'auto'
                                }}>
                                  {JSON.stringify(file.metadata.preview[0], null, 2)}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Collapse>

                  {index < files.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleReplaceClick(menuFileId!)}>
          <ReplaceIcon sx={{ mr: 1 }} />
          Replace File
        </MenuItem>
        <MenuItem onClick={() => handleDownload(files.find(f => f.id === menuFileId)!)}>
          <DownloadIcon sx={{ mr: 1 }} />
          Download
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => handleDeleteClick(menuFileId!)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete File</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this file? This action cannot be undone.
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
  );
};