import React, { useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Alert,
  Paper,
  Container
} from '@mui/material';
import {
  CloudUpload,
  TableChart,
  CheckCircle,
  Visibility,
  PlayArrow,
  Done
} from '@mui/icons-material';

import { useImportStore } from '../../store/importStore';
import { FileUploadComponent } from './FileUploadComponent';
import { ColumnMappingInterface } from './ColumnMappingInterface';
import { DataPreviewInterface } from './DataPreviewInterface';
import { ImportProgressMonitor } from './ImportProgressMonitor';

const steps = [
  {
    id: 'upload',
    label: 'Upload File',
    icon: <CloudUpload />,
    description: 'Upload your CSV or Excel file'
  },
  {
    id: 'mapping',
    label: 'Map Columns',
    icon: <TableChart />,
    description: 'Map your columns to system fields'
  },
  {
    id: 'validation',
    label: 'Validate Data',
    icon: <CheckCircle />,
    description: 'Review data validation results'
  },
  {
    id: 'preview',
    label: 'Preview & Review',
    icon: <Visibility />,
    description: 'Preview data and resolve entity matches'
  },
  {
    id: 'import',
    label: 'Import',
    icon: <PlayArrow />,
    description: 'Execute the import process'
  },
  {
    id: 'complete',
    label: 'Complete',
    icon: <Done />,
    description: 'Import completed successfully'
  }
];

export const ImportWorkflow: React.FC = () => {
  const {
    currentStep,
    uploadedFile,
    isUploading,
    uploadError,
    sourceColumns,
    targetFields,
    columnMappings,
    mappingValidation,
    isGeneratingMappings,
    validationResult,
    previewData,
    isValidating,
    currentJob,
    isImporting,
    loading,
    error,
    // Actions
    uploadFile,
    removeFile,
    setColumnMappings,
    generateAutoMappings,
    validateData,
    loadPreviewData,
    approveEntityMatch,
    rejectEntityMatch,
    bulkApproveMatches,
    startImport,
    cancelImport,
    retryImport,
    goToStep,
    nextStep,
    previousStep,
    resetWorkflow,
    clearError
  } = useImportStore();

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  useEffect(() => {
    // Auto-generate mappings when file is uploaded
    if (currentStep === 'mapping' && sourceColumns.length > 0 && columnMappings.length === 0) {
      generateAutoMappings();
    }
  }, [currentStep, sourceColumns, columnMappings.length, generateAutoMappings]);

  const handleFileUpload = async (file: File) => {
    await uploadFile(file);
  };

  const handleFileRemove = (fileId: string) => {
    removeFile();
  };

  const handleMappingChange = (mappings: any[]) => {
    setColumnMappings(mappings);
  };

  const handleMappingValidation = (validation: any) => {
    // Validation is handled automatically in the store
  };

  const handleNextStep = async () => {
    switch (currentStep) {
      case 'upload':
        if (uploadedFile) {
          nextStep();
        }
        break;
      case 'mapping':
        if (mappingValidation.isValid) {
          await validateData();
        }
        break;
      case 'validation':
        if (validationResult) {
          await loadPreviewData();
        }
        break;
      case 'preview':
        await startImport();
        break;
      default:
        nextStep();
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 'upload':
        return uploadedFile !== null;
      case 'mapping':
        return mappingValidation.isValid;
      case 'validation':
        return validationResult !== null;
      case 'preview':
        return previewData.length > 0;
      case 'import':
        return currentJob?.status === 'completed';
      default:
        return true;
    }
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <FileUploadComponent
            onFileUpload={handleFileUpload}
            onFileRemove={handleFileRemove}
            acceptedFormats={['.csv', '.xlsx', '.xls']}
            maxSize={10 * 1024 * 1024} // 10MB
            multiple={false}
          />
        );

      case 'mapping':
        return (
          <ColumnMappingInterface
            sourceColumns={sourceColumns}
            targetFields={targetFields}
            initialMappings={columnMappings}
            onMappingChange={handleMappingChange}
            onValidationChange={handleMappingValidation}
            loading={isGeneratingMappings}
          />
        );

      case 'validation':
        if (!validationResult) {
          return (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" gutterBottom>
                Validating data...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please wait while we validate your data against business rules.
              </Typography>
            </Box>
          );
        }

        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Data Validation Results
            </Typography>
            
            {validationResult.errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {validationResult.errors.length} validation errors found
                </Typography>
                <Typography variant="body2">
                  Please review and fix the errors before proceeding with the import.
                </Typography>
              </Alert>
            )}

            {validationResult.warnings.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {validationResult.warnings.length} warnings found
                </Typography>
                <Typography variant="body2">
                  These issues won't prevent the import but should be reviewed.
                </Typography>
              </Alert>
            )}

            {validationResult.errors.length === 0 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Data validation passed!
                </Typography>
                <Typography variant="body2">
                  {validationResult.summary.validRows} of {validationResult.summary.totalRows} rows are valid and ready for import.
                </Typography>
              </Alert>
            )}

            <Box display="flex" gap={2} mt={3}>
              <Box flex={1}>
                <Typography variant="h4" color="primary" textAlign="center">
                  {validationResult.summary.totalRows}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Total Rows
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="h4" color="success.main" textAlign="center">
                  {validationResult.summary.validRows}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Valid Rows
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="h4" color="error.main" textAlign="center">
                  {validationResult.summary.errorRows}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Error Rows
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="h4" color="warning.main" textAlign="center">
                  {validationResult.summary.warningRows}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Warning Rows
                </Typography>
              </Box>
            </Box>
          </Box>
        );

      case 'preview':
        if (previewData.length === 0) {
          return (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" gutterBottom>
                Loading preview data...
              </Typography>
            </Box>
          );
        }

        return (
          <DataPreviewInterface
            data={previewData}
            columns={sourceColumns}
            validationSummary={validationResult?.summary || {
              totalRows: 0,
              validRows: 0,
              errorRows: 0,
              warningRows: 0
            }}
            entityMatchSummary={{
              totalMatches: previewData.reduce((sum, row) => sum + row.entityMatches.length, 0),
              highConfidenceMatches: previewData.reduce((sum, row) => 
                sum + row.entityMatches.filter(match => match.confidence >= 80).length, 0
              ),
              lowConfidenceMatches: previewData.reduce((sum, row) => 
                sum + row.entityMatches.filter(match => match.confidence < 80 && match.confidence >= 50).length, 0
              ),
              noMatches: previewData.reduce((sum, row) => 
                sum + row.entityMatches.filter(match => match.confidence < 50).length, 0
              )
            }}
            onEntityMatchApproval={approveEntityMatch}
            onEntityMatchRejection={rejectEntityMatch}
            onBulkMatchApproval={bulkApproveMatches}
          />
        );

      case 'import':
        if (!currentJob) {
          return (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" gutterBottom>
                Starting import...
              </Typography>
            </Box>
          );
        }

        return (
          <ImportProgressMonitor
            jobId={currentJob.id}
            stages={currentJob.stages.map(stage => ({
              id: stage.id,
              name: stage.name,
              description: `Processing ${stage.name.toLowerCase()}...`,
              status: stage.status,
              progress: stage.progress,
              startTime: stage.startTime ? new Date(stage.startTime) : undefined,
              endTime: stage.endTime ? new Date(stage.endTime) : undefined
            }))}
            currentStage={currentJob.stages.findIndex(s => s.status === 'running')}
            overallProgress={currentJob.progress}
            status={currentJob.status}
            result={currentJob.result ? {
              summary: currentJob.result.summary,
              entities: currentJob.result.entities,
              errors: [],
              warnings: []
            } : undefined}
            onCancel={cancelImport}
            onRetry={retryImport}
            onDownloadReport={() => {
              // This would trigger a download
              console.log('Download report for job:', currentJob.id);
            }}
          />
        );

      case 'complete':
        return (
          <Box textAlign="center" py={4}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Import Completed Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Your data has been imported successfully. You can now view and manage your timetable data.
            </Typography>
            
            {currentJob?.result && (
              <Box mt={3}>
                <Typography variant="h6" gutterBottom>
                  Import Summary
                </Typography>
                <Box display="flex" justifyContent="center" gap={4} mt={2}>
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {currentJob.result.summary.successful}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Successful
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="h4" color="error.main">
                      {currentJob.result.summary.failed}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Failed
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {currentJob.result.summary.warnings}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Warnings
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}

            <Box mt={4}>
              <Button
                variant="contained"
                onClick={resetWorkflow}
                sx={{ mr: 2 }}
              >
                Import Another File
              </Button>
              <Button
                variant="outlined"
                onClick={() => window.location.href = '/timetables'}
              >
                View Timetables
              </Button>
            </Box>
          </Box>
        );

      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box py={4}>
        <Typography variant="h4" gutterBottom textAlign="center">
          Import Timetable Data
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" mb={4}>
          Upload and import your timetable data from CSV or Excel files
        </Typography>

        {/* Error Alert */}
        {(error || uploadError) && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={clearError}
          >
            {error || uploadError}
          </Alert>
        )}

        {/* Progress Stepper */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={currentStepIndex} alternativeLabel>
            {steps.map((step) => (
              <Step key={step.id}>
                <StepLabel icon={step.icon}>
                  <Typography variant="subtitle2">{step.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Step Content */}
        <Paper sx={{ p: 3, mb: 3 }}>
          {getStepContent()}
        </Paper>

        {/* Navigation Buttons */}
        <Box display="flex" justifyContent="space-between">
          <Button
            onClick={previousStep}
            disabled={currentStepIndex === 0 || currentStep === 'import'}
          >
            Previous
          </Button>
          
          <Box>
            {currentStep !== 'complete' && currentStep !== 'import' && (
              <Button
                variant="contained"
                onClick={handleNextStep}
                disabled={!canProceedToNext() || loading || isValidating || isImporting}
              >
                {currentStep === 'preview' ? 'Start Import' : 'Next'}
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Container>
  );
};