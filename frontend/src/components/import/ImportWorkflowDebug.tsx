import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { useImportStore } from '../../store/importStore';

export const ImportWorkflowDebug: React.FC = () => {
  const {
    currentStep,
    uploadedFile,
    isUploading,
    uploadError,
    isImporting,
    loading,
    isValidating,
    error
  } = useImportStore();

  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.100' }}>
      <Typography variant="h6" gutterBottom>
        Debug Info
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Chip label={`Step: ${currentStep}`} size="small" />
        <Chip label={`Has File: ${!!uploadedFile}`} size="small" />
        <Chip label={`Uploading: ${isUploading}`} size="small" />
        <Chip label={`Importing: ${isImporting}`} size="small" />
        <Chip label={`Loading: ${loading}`} size="small" />
        <Chip label={`Validating: ${isValidating}`} size="small" />
        <Chip label={`Has Error: ${!!error || !!uploadError}`} size="small" />
      </Box>
      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          Error: {error}
        </Typography>
      )}
      {uploadError && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          Upload Error: {uploadError}
        </Typography>
      )}
    </Paper>
  );
};