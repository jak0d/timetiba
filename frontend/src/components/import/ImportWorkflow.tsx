import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  Container,
  Card,
  CardContent,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Slide
} from '@mui/material';
import {
  CloudUpload,
  TableChart,
  CheckCircle,
  Visibility,
  PlayArrow,
  Done,
  Psychology as AIIcon,
  AutoFixHigh as MagicIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

import { useImportStore } from '../../store/importStore';
import { FileUploadComponent } from './FileUploadComponent';
import { ColumnMappingInterface } from './ColumnMappingInterface';
import { DataPreviewInterface } from './DataPreviewInterface';
import { ImportProgressMonitor } from './ImportProgressMonitor';
import { LLMImportInterface } from './LLMImportInterface';
import { FileAnalysisDisplay } from './FileAnalysisDisplay';
import { FileManager } from './FileManager';
import { ImportNavigation } from './ImportNavigation';
import { ImportWorkflowDebug } from './ImportWorkflowDebug';
import { importApi } from '../../services/importApi';

// Helper function to calculate estimated time remaining
const calculateEstimatedTime = (job: any): number | undefined => {
  if (!job || job.status !== 'running' || !job.stages) {
    return undefined;
  }

  const completedStages = job.stages.filter((s: any) => s.status === 'completed');
  const currentStage = job.stages.find((s: any) => s.status === 'running');
  
  if (!currentStage || completedStages.length === 0) {
    return undefined;
  }

  // Calculate average time per completed stage
  const totalCompletedTime = completedStages.reduce((total: number, stage: any) => {
    if (stage.startTime && stage.endTime) {
      return total + (new Date(stage.endTime).getTime() - new Date(stage.startTime).getTime());
    }
    return total;
  }, 0);

  if (totalCompletedTime === 0) {
    return undefined;
  }

  const avgTimePerStage = totalCompletedTime / completedStages.length;
  const remainingStages = job.stages.filter((s: any) => s.status === 'pending').length;
  
  // Estimate remaining time for current stage
  const currentStageProgress = currentStage.progress || 0;
  const currentStageRemaining = currentStageProgress > 0 
    ? (avgTimePerStage * (100 - currentStageProgress)) / 100 
    : avgTimePerStage;

  return currentStageRemaining + (remainingStages * avgTimePerStage);
};

// Define workflow steps with enhanced metadata
const getWorkflowSteps = (hasAIOption: boolean) => [
  {
    id: 'upload',
    label: 'Upload Files',
    icon: <CloudUpload />,
    description: 'Upload and manage your data files',
    status: 'pending' as const,
    estimatedTime: '1-2 min'
  },
  {
    id: 'analysis',
    label: 'File Analysis',
    icon: <CheckCircle />,
    description: 'Analyze file structure and content',
    status: 'pending' as const,
    estimatedTime: '30 sec'
  },
  ...(hasAIOption ? [{
    id: 'ai-processing',
    label: 'AI Processing',
    icon: <AIIcon />,
    description: 'AI-powered entity detection and mapping',
    status: 'pending' as const,
    optional: true,
    estimatedTime: '2-3 min'
  }] : []),
  {
    id: 'mapping',
    label: 'Column Mapping',
    icon: <TableChart />,
    description: 'Map columns to system fields',
    status: 'pending' as const,
    optional: hasAIOption,
    estimatedTime: '5-10 min'
  },
  {
    id: 'validation',
    label: 'Data Validation',
    icon: <CheckCircle />,
    description: 'Validate data quality and integrity',
    status: 'pending' as const,
    estimatedTime: '1-2 min'
  },
  {
    id: 'preview',
    label: 'Preview & Review',
    icon: <Visibility />,
    description: 'Review data before final import',
    status: 'pending' as const,
    estimatedTime: '2-5 min'
  },
  {
    id: 'import',
    label: 'Import Execution',
    icon: <PlayArrow />,
    description: 'Execute the data import process',
    status: 'pending' as const,
    estimatedTime: '3-10 min'
  },
  {
    id: 'complete',
    label: 'Complete',
    icon: <Done />,
    description: 'Import completed successfully',
    status: 'pending' as const,
    estimatedTime: '1 min'
  }
];

export const ImportWorkflow: React.FC = () => {
  const [showLLMImport, setShowLLMImport] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [managedFiles, setManagedFiles] = useState<any[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState(getWorkflowSteps(false));
  
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
    clearError,
    clearUploadError
  } = useImportStore();

  const currentStepIndex = workflowSteps.findIndex(step => step.id === currentStep);
  
  // Safety check to prevent errors if step is not found
  const safeCurrentStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  // Handle progress subscription cleanup
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (currentJob && currentJob.status === 'running') {
      const { subscribeToProgress } = useImportStore.getState();
      unsubscribe = subscribeToProgress();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentJob?.id, currentJob?.status]);

  // Update workflow steps based on current state
  useEffect(() => {
    const hasAI = uploadedFile && uploadedFile.id;
    const newSteps = getWorkflowSteps(!!hasAI);
    const stepIndex = newSteps.findIndex(step => step.id === currentStep);
    
    // Update step statuses based on current progress
    const updatedSteps = newSteps.map((step, index) => {
      if (index < stepIndex) {
        return { ...step, status: 'completed' as const };
      } else if (index === stepIndex) {
        return { ...step, status: 'active' as const };
      } else {
        return { ...step, status: 'pending' as const };
      }
    });
    
    setWorkflowSteps(updatedSteps);
  }, [currentStep, uploadedFile]);

  // Convert uploaded file to managed file format
  useEffect(() => {
    if (uploadedFile && !managedFiles.find(f => f.id === uploadedFile.id)) {
      const managedFile = {
        id: uploadedFile.id,
        filename: uploadedFile.filename,
        size: uploadedFile.size,
        status: 'ready' as const,
        progress: 100,
        uploadedAt: new Date(),
        metadata: uploadedFile.metadata ? {
          rows: uploadedFile.metadata.rows,
          columns: uploadedFile.metadata.columns,
          preview: uploadedFile.metadata.preview,
          fileType: uploadedFile.filename.split('.').pop()?.toUpperCase() || 'Unknown'
        } : undefined
      };
      
      setManagedFiles(prev => [...prev.filter(f => f.id !== uploadedFile.id), managedFile]);
      setSelectedFileId(uploadedFile.id);
    }
  }, [uploadedFile, managedFiles]);

  useEffect(() => {
    // Auto-generate mappings when file is uploaded
    if (currentStep === 'mapping' && sourceColumns.length > 0 && columnMappings.length === 0) {
      generateAutoMappings();
    }
  }, [currentStep, sourceColumns, columnMappings.length, generateAutoMappings]);

  useEffect(() => {
    // Clear errors when step changes (except when going to upload step)
    if (currentStep !== 'upload') {
      clearError();
      clearUploadError();
    }
  }, [currentStep, clearError, clearUploadError]);

  const handleFileUpload = async (file: File) => {
    // Clear any existing errors before upload
    clearError();
    clearUploadError();
    
    // Add file to managed files with uploading status
    const fileId = `${file.name}-${Date.now()}`;
    const newManagedFile = {
      id: fileId,
      filename: file.name,
      size: file.size,
      status: 'uploading' as const,
      progress: 0,
      uploadedAt: new Date()
    };
    
    setManagedFiles(prev => [...prev, newManagedFile]);
    
    try {
      // Update progress during upload
      setManagedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 50 } : f
      ));
      
      await uploadFile(file);
      
      // Update to analyzing status
      setManagedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'analyzing', progress: 75 } : f
      ));
      
      console.log('ImportWorkflow: File upload completed successfully');
    } catch (error) {
      console.error('ImportWorkflow: File upload failed:', error);
      
      // Update file status to error
      setManagedFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          status: 'error', 
          progress: 0, 
          error: error instanceof Error ? error.message : 'Upload failed' 
        } : f
      ));
    }
  };

  const handleFileDelete = (fileId: string) => {
    setManagedFiles(prev => prev.filter(f => f.id !== fileId));
    
    // If this was the selected file, clear selection and reset workflow
    if (selectedFileId === fileId) {
      setSelectedFileId(null);
      removeFile();
      goToStep('upload');
    }
  };

  const handleFileReplace = async (fileId: string, newFile: File) => {
    try {
      // Update file status to uploading
      setManagedFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          filename: newFile.name,
          size: newFile.size,
          status: 'uploading',
          progress: 0,
          uploadedAt: new Date()
        } : f
      ));
      
      await uploadFile(newFile);
      console.log('File replaced successfully');
    } catch (error) {
      console.error('File replacement failed:', error);
      setManagedFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Replacement failed' 
        } : f
      ));
    }
  };

  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
    const selectedFile = managedFiles.find(f => f.id === fileId);
    if (selectedFile && selectedFile.status === 'ready') {
      // If file is ready, we can proceed to next step
      if (currentStep === 'upload') {
        goToStep('analysis');
      }
    }
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
        return selectedFileId !== null && managedFiles.find(f => f.id === selectedFileId)?.status === 'ready';
      case 'analysis':
        return uploadedFile !== null;
      case 'ai-processing':
        return true; // AI processing is optional
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

  const canGoPrevious = () => {
    return safeCurrentStepIndex > 0 && !isImporting && !loading && !isValidating;
  };

  const handleStepClick = (stepIndex: number) => {
    const targetStep = workflowSteps[stepIndex];
    if (targetStep && (stepIndex <= safeCurrentStepIndex || targetStep.status === 'completed')) {
      goToStep(targetStep.id as any);
    }
  };

  const handleCancel = () => {
    if (isImporting || loading || isValidating) {
      setShowCancelDialog(true);
    } else {
      resetWorkflow();
    }
  };

  const handleCancelConfirm = () => {
    if (currentJob) {
      cancelImport();
    }
    resetWorkflow();
    setShowCancelDialog(false);
  };

  const handleRestart = () => {
    resetWorkflow();
    setManagedFiles([]);
    setSelectedFileId(null);
    setShowLLMImport(false);
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <Box>
            <FileManager
              files={managedFiles}
              onFileUpload={handleFileUpload}
              onFileDelete={handleFileDelete}
              onFileReplace={handleFileReplace}
              onFileSelect={handleFileSelect}
              selectedFileId={selectedFileId}
              maxFiles={3}
              acceptedFormats={['.csv', '.xlsx', '.xls']}
              maxSize={10 * 1024 * 1024} // 10MB
            />
          </Box>
        );

      case 'analysis':
        return (
          <Box>
            {selectedFileId && managedFiles.find(f => f.id === selectedFileId) && (
              <FileAnalysisDisplay 
                fileData={managedFiles.find(f => f.id === selectedFileId)!}
                showDetailed={true}
              />
            )}
            
            {/* File Analysis Results */}
            {uploadedFile && uploadedFile.id && (
              <Box sx={{ mt: 3 }}>
                {/* Enhanced File Analysis Display */}
                <FileAnalysisDisplay 
                  fileData={uploadedFile}
                  showDetailed={true}
                />

                {/* AI Import Recommendation */}
                <Card sx={{ 
                  border: '3px solid', 
                  borderColor: 'primary.main', 
                  bgcolor: 'primary.50',
                  position: 'relative',
                  overflow: 'visible'
                }}>
                  {/* Recommended Badge */}
                  <Box sx={{
                    position: 'absolute',
                    top: -12,
                    right: 20,
                    bgcolor: 'warning.main',
                    color: 'warning.contrastText',
                    px: 2,
                    py: 0.5,
                    borderRadius: 2,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    zIndex: 1
                  }}>
                    ⭐ RECOMMENDED
                  </Box>

                  <CardContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2
                      }}>
                        <AIIcon sx={{ color: 'white', fontSize: 24 }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                          AI-Powered Smart Import
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Skip manual mapping - let AI handle everything automatically
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Typography variant="body1" sx={{ mb: 3, fontWeight: 500 }}>
                      Your file is ready for AI analysis! Our intelligent system will:
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '45%' }}>
                        <CheckCircle sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Detect all entities automatically
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '45%' }}>
                        <CheckCircle sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Preserve your original names
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '45%' }}>
                        <CheckCircle sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Create intelligent mappings
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '45%' }}>
                        <CheckCircle sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Save 90% of your time
                        </Typography>
                      </Box>
                    </Box>

                    {/* Time Comparison */}
                    <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(255,255,255,0.7)' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, textAlign: 'center' }}>
                        ⏱️ Time Comparison
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="error.main">~30 min</Typography>
                          <Typography variant="caption" color="text.secondary">Manual Import</Typography>
                        </Box>
                        <Typography variant="h4" color="text.secondary">vs</Typography>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="success.main">~3 min</Typography>
                          <Typography variant="caption" color="text.secondary">AI Import</Typography>
                        </Box>
                      </Box>
                    </Paper>
                    
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<MagicIcon />}
                        onClick={() => setShowLLMImport(true)}
                        sx={{ 
                          minWidth: 200,
                          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #1976D2 30%, #0288D1 90%)',
                            transform: 'translateY(-2px)',
                            boxShadow: 4,
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        Use AI Import
                      </Button>
                      
                      <Button
                        variant="outlined"
                        size="large"
                        onClick={() => nextStep()}
                        sx={{ minWidth: 120 }}
                      >
                        Manual Import
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
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
            columns={sourceColumns || []}
            validationSummary={validationResult?.summary || {
              totalRows: 0,
              validRows: 0,
              errorRows: 0,
              warningRows: 0
            }}
            entityMatchSummary={{
              totalMatches: previewData.reduce((sum, row) => sum + (row.entityMatches?.length || 0), 0),
              highConfidenceMatches: previewData.reduce((sum, row) => 
                sum + (row.entityMatches?.filter(match => (match as any).confidence >= 80).length || 0), 0
              ),
              lowConfidenceMatches: previewData.reduce((sum, row) => 
                sum + (row.entityMatches?.filter(match => (match as any).confidence < 80 && (match as any).confidence >= 50).length || 0), 0
              ),
              noMatches: previewData.reduce((sum, row) => 
                sum + (row.entityMatches?.filter(match => (match as any).confidence < 50).length || 0), 0
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
              {error && (
                <Alert severity="error" sx={{ mt: 2, maxWidth: 600, mx: 'auto' }}>
                  <Typography variant="body2">
                    Failed to start import: {error}
                  </Typography>
                  <Box mt={1}>
                    <Button 
                      size="small" 
                      onClick={() => {
                        clearError();
                        previousStep();
                      }}
                    >
                      Go Back
                    </Button>
                  </Box>
                </Alert>
              )}
            </Box>
          );
        }

        return (
          <ImportProgressMonitor
            jobId={currentJob.id}
            stages={currentJob.stages?.map((stage, index) => ({
              id: stage.id || `stage-${index}`,
              name: stage.name || `Stage ${index + 1}`,
              description: `Processing ${(stage.name || 'stage').toLowerCase()}...`,
              status: stage.status || 'pending',
              progress: Math.min(100, Math.max(0, stage.progress || 0)),
              startTime: stage.startTime ? new Date(stage.startTime) : undefined,
              endTime: stage.endTime ? new Date(stage.endTime) : undefined,
              details: [], // Add empty details array
              errors: [] // Add empty errors array
            })) || []}
            currentStage={Math.max(0, currentJob.stages?.findIndex(s => s.status === 'running') || 0)}
            overallProgress={Math.min(100, Math.max(0, currentJob.progress || 0))}
            status={currentJob.status === 'processing' ? 'running' : currentJob.status || 'pending'}
            result={currentJob.result ? {
              summary: currentJob.result.summary || {
                totalProcessed: 0,
                successful: 0,
                failed: 0,
                warnings: 0
              },
              entities: currentJob.result.entities || {
                venues: { created: 0, updated: 0, errors: 0 },
                lecturers: { created: 0, updated: 0, errors: 0 },
                courses: { created: 0, updated: 0, errors: 0 },
                schedules: { created: 0, updated: 0, errors: 0 }
              },
              errors: [],
              warnings: []
            } : undefined}
            onCancel={cancelImport}
            onRetry={retryImport}
            onDownloadReport={() => {
              // This would trigger a download
              console.log('Download report for job:', currentJob.id);
            }}
            estimatedTimeRemaining={calculateEstimatedTime(currentJob)}
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
          Upload and import your timetable data with intelligent file management
        </Typography>

        {/* Debug Component - Remove in production */}
        <ImportWorkflowDebug />

        {/* Enhanced Navigation */}
        {workflowSteps.length > 0 && (
          <ImportNavigation
            steps={workflowSteps}
            currentStepIndex={safeCurrentStepIndex}
            canGoNext={canProceedToNext()}
            canGoPrevious={canGoPrevious()}
            isProcessing={isImporting || loading || isValidating}
            progress={isImporting ? currentJob?.progress : undefined}
            onNext={handleNextStep}
            onPrevious={previousStep}
            onStepClick={handleStepClick}
            onCancel={handleCancel}
            onRestart={handleRestart}
            showBreadcrumbs={true}
            showProgress={true}
            variant="horizontal"
          />
        )}

        {/* Error Alert */}
        {(error || uploadError) && (
          <Slide in direction="up" timeout={500}>
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={() => {
                if (error) clearError();
                if (uploadError) clearUploadError();
              }}
            >
              {error || uploadError}
            </Alert>
          </Slide>
        )}

        {/* Step Content */}
        <Fade in timeout={600}>
          <Paper sx={{ p: 3, mb: 3 }}>
            {showLLMImport && uploadedFile ? (
              <LLMImportInterface
                fileId={uploadedFile.id}
                fileData={uploadedFile}
                onComplete={(result) => {
                  console.log('LLM Import completed:', result);
                  setShowLLMImport(false);
                  goToStep('complete');
                }}
                onCancel={() => setShowLLMImport(false)}
              />
            ) : (
              getStepContent()
            )}
          </Paper>
        </Fade>

        {/* Cancel Confirmation Dialog */}
        <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
              Cancel Import Process
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to cancel the import process? 
              {isImporting && ' This will stop the current import job.'}
              {' All progress will be lost.'}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCancelDialog(false)}>
              Continue Import
            </Button>
            <Button onClick={handleCancelConfirm} color="error" variant="contained">
              Cancel Import
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};