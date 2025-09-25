import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  InsertDriveFile,
  CheckCircle,
  Error
} from '@mui/icons-material';

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void>;
  onFileRemove: (fileId: string) => void;
  acceptedFormats?: string[];
  maxSize?: number;
  multiple?: boolean;
}

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  metadata?: {
    rows: number;
    columns: string[];
    size: string;
  };
}

export const FileUploadComponent: React.FC<FileUploadProps> = ({
  onFileUpload,
  onFileRemove,
  acceptedFormats = ['.csv', '.xlsx', '.xls'],
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = false
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMimeType = (extension: string): string => {
    const mimeTypes: Record<string, string> = {
      '.csv': 'text/csv',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel'
    };
    return mimeTypes[extension] || 'application/octet-stream';
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const filesToProcess = multiple ? acceptedFiles : acceptedFiles.slice(0, 1);
    
    for (const file of filesToProcess) {
      const fileId = `${file.name}-${Date.now()}`;
      const uploadedFile: UploadedFile = {
        id: fileId,
        file,
        status: 'uploading',
        progress: 0
      };

      setUploadedFiles(prev => [...prev, uploadedFile]);

      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === fileId 
                ? { ...f, progress: Math.min(f.progress + 10, 90) }
                : f
            )
          );
        }, 200);

        await onFileUpload(file);
        
        clearInterval(progressInterval);
        
        // Mock metadata - in real implementation, this would come from the API
        const mockMetadata = {
          rows: Math.floor(Math.random() * 1000) + 100,
          columns: ['Name', 'Email', 'Department', 'Course Code'],
          size: formatFileSize(file.size)
        };

        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'success', progress: 100, metadata: mockMetadata }
              : f
          )
        );
      } catch (error) {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { 
                  ...f, 
                  status: 'error', 
                  progress: 0, 
                  error: error instanceof Error ? error.message : 'Upload failed' 
                }
              : f
          )
        );
      }
    }
  }, [onFileUpload, multiple]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFormats.reduce((acc, format) => {
      acc[getMimeType(format)] = [format];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize,
    multiple,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false)
  });

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    onFileRemove(fileId);
  };

  return (
    <Box>
      <Card
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive || dragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragActive || dragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover'
          }
        }}
      >
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <input {...getInputProps()} />
          <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {isDragActive || dragActive
              ? 'Drop files here...'
              : 'Drag & drop files here, or click to select'
            }
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supported formats: {acceptedFormats.join(', ')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Maximum file size: {formatFileSize(maxSize)}
          </Typography>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Uploaded Files
          </Typography>
          <List>
            {uploadedFiles.map((uploadedFile) => (
              <ListItem key={uploadedFile.id} divider>
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                  {uploadedFile.status === 'success' && (
                    <CheckCircle color="success" />
                  )}
                  {uploadedFile.status === 'error' && (
                    <Error color="error" />
                  )}
                  {uploadedFile.status === 'uploading' && (
                    <InsertDriveFile color="primary" />
                  )}
                </Box>
                <ListItemText
                  primary={uploadedFile.file.name}
                  secondary={
                    <Box>
                      {uploadedFile.status === 'uploading' && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Uploading... {uploadedFile.progress}%
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={uploadedFile.progress} 
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      )}
                      {uploadedFile.status === 'success' && uploadedFile.metadata && (
                        <Typography variant="body2" color="text.secondary">
                          {uploadedFile.metadata.rows} rows, {uploadedFile.metadata.columns.length} columns, {uploadedFile.metadata.size}
                        </Typography>
                      )}
                      {uploadedFile.status === 'error' && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {uploadedFile.error}
                        </Alert>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveFile(uploadedFile.id)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};