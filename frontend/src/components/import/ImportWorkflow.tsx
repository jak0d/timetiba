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

// Define workflow steps with enhanced metadata for progressive workflow
const getWorkflowSteps = (hasAIOption: boolean) => [
  {
    id: 'upload',
    label: 'Upload Files',
    icon: <CloudUpload />,
    description: 'Upload and manage your data files',
    status: 'pending' as const,
    estimatedTime: '1-2 min',
    requiresManualAdvancement: true
  },
  {
    id: 'analysis',
    label: 'File Analysis',
    icon: <CheckCircle />,
    description: 'Analyze file structure and choose import method',
    status: 'pending' as const,
    estimatedTime: '30 sec',
    requiresManualAdvancement: true
  },
  ...(hasAIOption ? [{
    id: 'ai-processing',
    label: 'AI Processing',
    icon: <AIIcon />,
    description: 'AI-powered entity detection and mapping',
    status: 'pending' as const,
    optional: true,
    estimatedTime: '2-3 min',
    requiresManualAdvancement: true
  }] : []),
  {
    id: 'mapping',
    label: 'Column Mapping',
    icon: <TableChart />,
    description: 'Map columns to system fields',
    status: 'pending' as const,
    optional: hasAIOption,
    estimatedTime: '5-10 min',
    requiresManualAdvancement: true
  },
  {
    id: 'validation',
    label: 'Data Validation',
    icon: <CheckCircle />,
    description: 'Validate data quality and integrity',
    status: 'pending' as const,
    estimatedTime: '1-2 min',
    requiresManualAdvancement: true
  },
  {
    id: 'preview',
    label: 'Preview & Review',
    icon: <Visibility />,
    description: 'Review data before final import',
    status: 'pending' as const,
    estimatedTime: '2-5 min',
    requiresManualAdvancement: true
  },
  {
    id: 'import',
    label: 'Import Execution',
    icon: <PlayArrow />,
    description: 'Execute the data import process',
    status: 'pending' as const,
    estimatedTime: '3-10 min',
    requiresManualAdvancement: true
  },
  {
    id: 'complete',
    label: 'Complete',
    icon: <Done />,
    description: 'Import completed successfully',
    status: 'pending' as const,
    estimatedTime: '1 min',
    requiresManualAdvancement: false
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

  // Convert uploaded file to managed file format and prevent duplicates
  useEffect(() => {
    if (uploadedFile) {
      const existingFile = managedFiles.find(f => f.id === uploadedFile.id);
      
      if (!existingFile) {
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
        
        // Remove any temporary files and files with same name, then add the real uploaded file
        setManagedFiles(prev => [
          ...prev.filter(f => 
            f.id !== uploadedFile.id && 
            !f.id.startsWith('temp-') && 
            f.filename !== uploadedFile.filename
          ), 
          managedFile
        ]);
        setSelectedFileId(uploadedFile.id);
      } else if (existingFile.status !== 'ready') {
        // Update existing file to ready status
        setManagedFiles(prev => prev.map(f => 
          f.id === uploadedFile.id 
            ? { ...f, status: 'ready' as const, progress: 100 }
            : f
        ));
        setSelectedFileId(uploadedFile.id);
      }
    }
  }, [uploadedFile]);

  // Clean up duplicate files based on filename
  useEffect(() => {
    const filesByName = new Map<string, any[]>();
    
    // Group files by filename
    managedFiles.forEach(file => {
      const files = filesByName.get(file.filename) || [];
      files.push(file);
      filesByName.set(file.filename, files);
    });
    
    // Check for duplicates and clean them up
    let hasChanges = false;
    const cleanedFiles: any[] = [];
    
    filesByName.forEach((files, filename) => {
      if (files.length > 1) {
        hasChanges = true;
        // Keep the most recent ready file, or the one that matches uploadedFile
        const readyFiles = files.filter(f => f.status === 'ready');
        const uploadedFileMatch = files.find(f => f.id === uploadedFile?.id);
        
        if (uploadedFileMatch) {
          cleanedFiles.push(uploadedFileMatch);
        } else if (readyFiles.length > 0) {
          // Keep the most recent ready file
          cleanedFiles.push(readyFiles[readyFiles.length - 1]);
        } else {
          // Keep the most recent file
          cleanedFiles.push(files[files.length - 1]);
        }
      } else {
        cleanedFiles.push(files[0]);
      }
    });
    
    if (hasChanges) {
      setManagedFiles(cleanedFiles);
    }
  }, [managedFiles, uploadedFile?.id]);

  // Removed automatic mapping generation - user must manually trigger this

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
    const tempFileId = `temp-${file.name}-${Date.now()}`;
    const newManagedFile = {
      id: tempFileId,
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
        f.id === tempFileId ? { ...f, progress: 50 } : f
      ));
      
      await uploadFile(file);
      
      // Remove the temporary file entry since uploadFile will create the real one
      setManagedFiles(prev => prev.filter(f => f.id !== tempFileId));
      
      console.log('ImportWorkflow: File upload completed successfully');
    } catch (error) {
      console.error('ImportWorkflow: File upload failed:', error);
      
      // Update file status to error
      setManagedFiles(prev => prev.map(f => 
        f.id === tempFileId ? { 
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
      
      // Remove the old file from managed files before upload
      setManagedFiles(prev => prev.filter(f => f.id !== fileId));
      
      await uploadFile(newFile);
      console.log('File replaced successfully');
    } catch (error) {
      console.error('File replacement failed:', error);
      // Re-add the file with error status if replacement fails
      setManagedFiles(prev => [...prev, {
        id: fileId,
        filename: newFile.name,
        size: newFile.size,
        status: 'error' as const,
        progress: 0,
        uploadedAt: new Date(),
        error: error instanceof Error ? error.message : 'Replacement failed'
      }]);
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
    // Progressive workflow - user must manually advance through each step
    switch (currentStep) {
      case 'upload':
        if (uploadedFile) {
          // Move to analysis step - no automatic processing
          goToStep('analysis');
        }
        break;
      case 'analysis':
        // User must choose between AI or manual import
        // Show an alert if they try to proceed without selecting
        alert('Please select an import method (AI-Powered or Manual) before proceeding.');
        break;
      case 'ai-processing':
        // After AI processing completes, user must manually proceed
        if (columnMappings.length > 0) {
          goToStep('validation');
        } else {
          // Skip to mapping if AI didn't work
          goToStep('mapping');
        }
        break;
      case 'mapping':
        // User must manually proceed after completing mappings
        if (mappingValidation.isValid) {
          goToStep('validation');
        }
        break;
      case 'validation':
        // User must manually trigger data validation and then proceed
        if (!validationResult) {
          await validateData();
        } else {
          goToStep('preview');
        }
        break;
      case 'preview':
        // User must manually trigger preview loading and then proceed
        if (previewData.length === 0) {
          await loadPreviewData();
        } else {
          goToStep('import');
        }
        break;
      case 'import':
        // User must manually start the import process
        if (!currentJob) {
          await startImport();
        } else if (currentJob.status === 'completed') {
          goToStep('complete');
        }
        break;
      default:
        // For any other steps, just move to next
        nextStep();
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 'upload':
        return selectedFileId !== null && managedFiles.find(f => f.id === selectedFileId)?.status === 'ready';
      case 'analysis':
        // User cannot proceed until they select an import method
        // The buttons in the analysis step handle the navigation directly
        return false;
      case 'ai-processing':
        // User can proceed after AI processing is complete
        return columnMappings.length > 0;
      case 'mapping':
        return mappingValidation.isValid;
      case 'validation':
        // User can proceed to preview after validation is complete
        return validationResult !== null;
      case 'preview':
        // User can proceed to import after preview is loaded
        return previewData.length > 0;
      case 'import':
        // User can proceed to complete after import finishes
        return currentJob?.status === 'completed';
      default:
        return true;
    }
  };

  const getNextButtonText = () => {
    switch (currentStep) {
      case 'upload':
        return 'Analyze File';
      case 'analysis':
        return 'Select Import Method'; // User must choose AI or manual
      case 'ai-processing':
        return 'Proceed to Validation';
      case 'mapping':
        return 'Validate Data';
      case 'validation':
        return validationResult ? 'Preview Data' : 'Run Validation';
      case 'preview':
        return previewData.length > 0 ? 'Start Import' : 'Load Preview';
      case 'import':
        return currentJob?.status === 'completed' ? 'View Results' : 'Start Import';
      default:
        return 'Next';
    }
  };

  const isProcessingStep = () => {
    return (currentStep === 'validation' && !validationResult && isValidating) ||
           (currentStep === 'preview' && previewData.length === 0 && loading) ||
           (currentStep === 'import' && !currentJob && isImporting);
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
            {/* Progressive Workflow Notice */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Progressive Import Workflow
              </Typography>
              <Typography variant="body2">
                Review your file analysis below and choose your import method. 
                Click "Continue" when ready to proceed - no automatic progression will occur.
              </Typography>
            </Alert>

            {/* Show analysis for the selected file only */}
            {uploadedFile && uploadedFile.id && (
              <Box>
                {/* Enhanced File Analysis Display */}
                <FileAnalysisDisplay 
                  fileData={uploadedFile}
                  showDetailed={true}
                />

                {/* Import Method Selection */}
                <Card sx={{ 
                  border: '2px solid', 
                  borderColor: 'primary.main', 
                  bgcolor: 'primary.50',
                  mt: 3
                }}>
                  <CardContent>
                    <Typography variant="h6" color="primary.main" sx={{ mb: 2, fontWeight: 600 }}>
                      Choose Your Import Method
                    </Typography>
                    
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Required:</strong> You must select an import method below to proceed. 
                        The "Next" button is disabled until you make a selection.
                      </Typography>
                    </Alert>
                    
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                      {/* AI Import Option */}
                      <Paper sx={{ 
                        p: 2, 
                        flex: 1, 
                        border: '2px solid', 
                        borderColor: 'success.main',
                        bgcolor: 'success.50'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <AIIcon sx={{ color: 'success.main', mr: 1 }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            AI-Powered Import
                          </Typography>
                          <Chip label="RECOMMENDED" size="small" color="warning" sx={{ ml: 1 }} />
                        </Box>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          Let AI automatically detect entities and create mappings. Saves 90% of your time.
                        </Typography>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<MagicIcon />}
                          onClick={() => {
                            setShowLLMImport(true);
                            goToStep('ai-processing');
                          }}
                          fullWidth
                        >
                          Use AI Import
                        </Button>
                      </Paper>

                      {/* Manual Import Option */}
                      <Paper sx={{ 
                        p: 2, 
                        flex: 1, 
                        border: '2px solid', 
                        borderColor: 'grey.300'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <TableChart sx={{ color: 'primary.main', mr: 1 }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Manual Import
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          Manually map columns and configure import settings. Full control over the process.
                        </Typography>
                        <Button
                          variant="outlined"
                          onClick={() => goToStep('mapping')}
                          fullWidth
                        >
                          Manual Import
                        </Button>
                      </Paper>
                    </Box>

                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>Progressive Workflow:</strong> After making your selection, 
                        you'll need to manually advance through each subsequent step. 
                        No automatic progression will occur.
                      </Typography>
                    </Alert>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        );

      case 'ai-processing':
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                AI Processing Step
              </Typography>
              <Typography variant="body2">
                AI will analyze your data and create intelligent mappings. 
                If processing fails, you can retry or switch to manual import.
              </Typography>
            </Alert>

            {/* Error Recovery Information */}
            <Card sx={{ mb: 3, border: '1px solid', borderColor: 'warning.main', bgcolor: 'warning.50' }}>
              <CardContent>
                <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1, fontWeight: 600 }}>
                  💡 If AI Processing Fails
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Don't worry! If you see a "Processing Error" message, you have several options:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Retry:</strong> Click the retry button to try AI processing again
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Manual Import:</strong> Switch to manual column mapping for full control
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Go Back:</strong> Return to analysis to check your file or upload a different one
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {showLLMImport && (
              <LLMImportInterface
                fileId={uploadedFile?.id || ''}
                onComplete={(mappings) => {
                  setColumnMappings(mappings);
                  setShowLLMImport(false);
                }}
                onCancel={() => {
                  setShowLLMImport(false);
                  goToStep('analysis');
                }}
              />
            )}

            {!showLLMImport && columnMappings.length > 0 && (
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  AI Processing Complete!
                </Typography>
                <Typography variant="body2">
                  AI has successfully analyzed your data and created {columnMappings.length} column mappings. 
                  Click "Proceed to Validation" to continue with the import process.
                </Typography>
              </Alert>
            )}

            {!showLLMImport && columnMappings.length === 0 && (
              <Box>
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    AI Processing Not Started
                  </Typography>
                  <Typography variant="body2">
                    AI processing hasn't been started yet or was cancelled. 
                    You can start AI processing or switch to manual import.
                  </Typography>
                </Alert>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setShowLLMImport(true)}
                    startIcon={<AIIcon />}
                  >
                    Start AI Processing
                  </Button>
                  
                  <Button
                    variant="outlined"
                    onClick={() => goToStep('mapping')}
                  >
                    Switch to Manual Import
                  </Button>
                  
                  <Button
                    variant="text"
                    onClick={() => goToStep('analysis')}
                  >
                    Back to Analysis
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        );

      case 'mapping':
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Manual Column Mapping Required
              </Typography>
              <Typography variant="body2">
                Configure your column mappings below. Once complete, click "Validate Data" to proceed to the next step.
              </Typography>
            </Alert>
            
            <ColumnMappingInterface
              sourceColumns={sourceColumns}
              targetFields={targetFields}
              initialMappings={columnMappings}
              onMappingChange={handleMappingChange}
              onValidationChange={handleMappingValidation}
              loading={isGeneratingMappings}
            />
          </Box>
        );

      case 'validation':
        if (!validationResult && !isValidating) {
          return (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Data Validation Required
                </Typography>
                <Typography variant="body2">
                  Click "Run Validation" to validate your data against business rules. 
                  You must complete validation before proceeding.
                </Typography>
              </Alert>
              
              <Box textAlign="center" py={4}>
                <Typography variant="h6" gutterBottom>
                  Ready to Validate Data
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Your column mappings are configured. Click the button below to start validation.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => validateData()}
                  startIcon={<CheckCircle />}
                >
                  Run Validation
                </Button>
              </Box>
            </Box>
          );
        }

        if (isValidating) {
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
        if (previewData.length === 0 && !loading) {
          return (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Data Preview Required
                </Typography>
                <Typography variant="body2">
                  Click "Load Preview" to review your data before starting the import. 
                  You must review the preview before proceeding.
                </Typography>
              </Alert>
              
              <Box textAlign="center" py={4}>
                <Typography variant="h6" gutterBottom>
                  Ready to Preview Data
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Data validation is complete. Click the button below to load a preview of your data.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => loadPreviewData()}
                  startIcon={<Visibility />}
                >
                  Load Preview
                </Button>
              </Box>
            </Box>
          );
        }

        if (loading) {
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
            isProcessing={isProcessingStep()}
            progress={isImporting ? currentJob?.progress : undefined}
            nextButtonText={getNextButtonText()}
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