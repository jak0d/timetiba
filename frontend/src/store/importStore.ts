import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { importApi, type ColumnMapping, type ImportJob, type ValidationResult, type EntityMatch } from '../services/importApi';

interface ImportFile {
  id: string;
  filename: string;
  size: number;
  metadata: {
    rows: number;
    columns: string[];
    preview: Record<string, any>[];
  };
}

interface ImportWorkflowState {
  // Current workflow state
  currentStep: 'upload' | 'analysis' | 'ai-processing' | 'mapping' | 'validation' | 'preview' | 'import' | 'complete';
  currentStage: string;
  progress: number;
  
  // File management
  uploadedFile: ImportFile | null;
  isUploading: boolean;
  uploadError: string | null;
  
  // Column mapping
  sourceColumns: string[];
  targetFields: Array<{
    name: string;
    label: string;
    required: boolean;
    dataType: string;
    description?: string;
    examples?: string[];
  }>;
  columnMappings: ColumnMapping[];
  mappingValidation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  isGeneratingMappings: boolean;
  
  // Data validation and preview
  validationResult: ValidationResult | null;
  previewData: Array<{
    id: string;
    data: Record<string, any>;
    validationResults: Array<{
      field: string;
      type: 'error' | 'warning' | 'info';
      message: string;
      suggestion?: string;
    }>;
    entityMatches: EntityMatch[];
  }>;
  entityMatches: EntityMatch[];
  isValidating: boolean;
  
  // Import job
  currentJob: ImportJob | null;
  jobHistory: ImportJob[];
  isImporting: boolean;
  
  // UI state
  loading: boolean;
  error: string | null;
}

interface ImportWorkflowActions {
  // File upload actions
  uploadFile: (file: File) => Promise<void>;
  removeFile: () => void;
  
  // Column mapping actions
  setColumnMappings: (mappings: ColumnMapping[]) => void;
  generateAutoMappings: () => Promise<void>;
  validateMappings: () => Promise<void>;
  
  // Data validation actions
  validateData: () => Promise<void>;
  loadPreviewData: (page?: number, limit?: number) => Promise<void>;
  
  // Entity matching actions
  approveEntityMatch: (rowId: string, matchType: string, matchId: string) => Promise<void>;
  rejectEntityMatch: (rowId: string, matchType: string) => Promise<void>;
  bulkApproveMatches: (matchType: string, threshold: number) => Promise<void>;
  
  // Import job actions
  startImport: (options?: {
    skipValidation?: boolean;
    conflictResolution?: 'skip' | 'overwrite' | 'merge';
    notifyOnCompletion?: boolean;
  }) => Promise<void>;
  cancelImport: () => Promise<void>;
  retryImport: () => Promise<void>;
  subscribeToProgress: () => () => void;
  
  // Navigation actions
  goToStep: (step: ImportWorkflowState['currentStep']) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetWorkflow: () => void;
  
  // Utility actions
  setError: (error: string | null) => void;
  clearError: () => void;
  clearUploadError: () => void;
  setProgress: (progress: number) => void;
  setCurrentStage: (stage: string) => void;
}

const initialState: ImportWorkflowState = {
  currentStep: 'upload',
  currentStage: '',
  progress: 0,
  uploadedFile: null,
  isUploading: false,
  uploadError: null,
  sourceColumns: [],
  targetFields: [
    { name: 'venueName', label: 'Venue Name', required: true, dataType: 'string', description: 'Name of the venue' },
    { name: 'venueCapacity', label: 'Venue Capacity', required: false, dataType: 'number', description: 'Maximum capacity of the venue' },
    { name: 'venueLocation', label: 'Venue Location', required: false, dataType: 'string', description: 'Physical location of the venue' },
    { name: 'lecturerName', label: 'Lecturer Name', required: true, dataType: 'string', description: 'Full name of the lecturer' },
    { name: 'lecturerEmail', label: 'Lecturer Email', required: false, dataType: 'email', description: 'Email address of the lecturer' },
    { name: 'lecturerDepartment', label: 'Lecturer Department', required: false, dataType: 'string', description: 'Department the lecturer belongs to' },
    { name: 'courseCode', label: 'Course Code', required: true, dataType: 'string', description: 'Unique course identifier' },
    { name: 'courseName', label: 'Course Name', required: true, dataType: 'string', description: 'Full name of the course' },
    { name: 'courseCredits', label: 'Course Credits', required: false, dataType: 'number', description: 'Number of credits for the course' },
    { name: 'studentGroupName', label: 'Student Group Name', required: true, dataType: 'string', description: 'Name of the student group' },
    { name: 'studentGroupSize', label: 'Student Group Size', required: false, dataType: 'number', description: 'Number of students in the group' },
    { name: 'scheduleDay', label: 'Schedule Day', required: true, dataType: 'string', description: 'Day of the week for the schedule' },
    { name: 'scheduleStartTime', label: 'Start Time', required: true, dataType: 'time', description: 'Start time of the class' },
    { name: 'scheduleEndTime', label: 'End Time', required: true, dataType: 'time', description: 'End time of the class' },
    { name: 'scheduleDuration', label: 'Duration', required: false, dataType: 'number', description: 'Duration in minutes' },
  ],
  columnMappings: [],
  mappingValidation: { isValid: false, errors: [], warnings: [] },
  isGeneratingMappings: false,
  validationResult: null,
  previewData: [],
  entityMatches: [],
  isValidating: false,
  currentJob: null,
  jobHistory: [],
  isImporting: false,
  loading: false,
  error: null,
};

export const useImportStore = create<ImportWorkflowState & ImportWorkflowActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // File upload actions
      uploadFile: async (file: File) => {
        console.log('Starting file upload:', file.name, file.size);
        set({ isUploading: true, uploadError: null, error: null });
        try {
          const response = await importApi.uploadFile(file);
          console.log('Upload response:', response);
          
          // Ensure response has the expected structure
          if (!response || !response.fileId) {
            throw new Error('Invalid response from server: missing fileId');
          }
          
          const metadata = response.metadata || { rows: 0, columns: [], preview: [] };
          const columns = metadata.columns || [];
          
          set({
            uploadedFile: {
              id: response.fileId,
              filename: response.filename || file.name,
              size: response.size || file.size,
              metadata: {
                rows: metadata.rows || 0,
                columns: columns,
                preview: metadata.preview || []
              },
            },
            sourceColumns: columns,
            isUploading: false,
            uploadError: null, // Explicitly clear upload error on success
            error: null, // Also clear general error
            // Remove automatic step progression - user must manually advance
          });
          console.log('Upload successful, state updated');
        } catch (error) {
          console.error('Upload failed:', error);
          set({
            uploadError: error instanceof Error ? error.message : 'Upload failed',
            isUploading: false,
          });
        }
      },

      removeFile: () => {
        const { uploadedFile } = get();
        if (uploadedFile) {
          importApi.deleteFile(uploadedFile.id).catch(console.error);
        }
        set({
          uploadedFile: null,
          sourceColumns: [],
          columnMappings: [],
          validationResult: null,
          previewData: [],
          entityMatches: [],
          currentStep: 'upload',
        });
      },

      // Column mapping actions
      setColumnMappings: (mappings: ColumnMapping[]) => {
        set({ columnMappings: mappings });
        
        // Validate mappings
        const { targetFields } = get();
        const errors: string[] = [];
        const warnings: string[] = [];

        const requiredFields = targetFields.filter(f => f.required);
        const mappedFields = mappings.filter(m => m.targetField).map(m => m.targetField);
        
        requiredFields.forEach(field => {
          if (!mappedFields.includes(field.name)) {
            errors.push(`Required field "${field.label}" is not mapped`);
          }
        });

        const duplicates = mappedFields.filter((field, index) => 
          field && mappedFields.indexOf(field) !== index
        );
        duplicates.forEach(field => {
          const targetField = targetFields.find(f => f.name === field);
          errors.push(`Field "${targetField?.label}" is mapped multiple times`);
        });

        mappings.forEach(mapping => {
          if (mapping.targetField && mapping.confidence < 50) {
            warnings.push(`Low confidence mapping: "${mapping.sourceColumn}" → "${targetFields.find(f => f.name === mapping.targetField)?.label}"`);
          }
        });

        set({
          mappingValidation: {
            isValid: errors.length === 0,
            errors,
            warnings,
          },
        });
      },

      generateAutoMappings: async () => {
        const { uploadedFile } = get();
        if (!uploadedFile) return;

        set({ isGeneratingMappings: true });
        try {
          const mappings = await importApi.getAutoMapping(uploadedFile.id);
          get().setColumnMappings(mappings);
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to generate mappings' });
        } finally {
          set({ isGeneratingMappings: false });
        }
      },

      validateMappings: async () => {
        const { uploadedFile, columnMappings } = get();
        if (!uploadedFile) return;

        set({ isValidating: true });
        try {
          const result = await importApi.validateMapping(uploadedFile.id, columnMappings);
          set({ validationResult: result });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Validation failed' });
        } finally {
          set({ isValidating: false });
        }
      },

      // Data validation actions
      validateData: async () => {
        const { uploadedFile, columnMappings } = get();
        if (!uploadedFile) return;

        set({ isValidating: true });
        try {
          const result = await importApi.validateData(uploadedFile.id, columnMappings);
          set({ validationResult: result });
          // Remove automatic step progression - user must manually advance
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Data validation failed' });
        } finally {
          set({ isValidating: false });
        }
      },

      loadPreviewData: async (page = 1, limit = 50) => {
        const { uploadedFile, columnMappings } = get();
        if (!uploadedFile) return;

        set({ loading: true });
        try {
          const response = await importApi.getDataPreview(uploadedFile.id, columnMappings, page, limit);
          set({ 
            previewData: response.data,
            // Remove automatic step progression - user must manually advance
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load preview data' });
        } finally {
          set({ loading: false });
        }
      },

      // Entity matching actions
      approveEntityMatch: async (rowId: string, matchType: string, matchId: string) => {
        const { uploadedFile } = get();
        if (!uploadedFile) return;

        try {
          await importApi.approveEntityMatch(uploadedFile.id, rowId, matchType, matchId);
          // Refresh preview data
          get().loadPreviewData();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to approve match' });
        }
      },

      rejectEntityMatch: async (rowId: string, matchType: string) => {
        const { uploadedFile } = get();
        if (!uploadedFile) return;

        try {
          await importApi.rejectEntityMatch(uploadedFile.id, rowId, matchType);
          // Refresh preview data
          get().loadPreviewData();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to reject match' });
        }
      },

      bulkApproveMatches: async (matchType: string, threshold: number) => {
        const { uploadedFile } = get();
        if (!uploadedFile) return;

        try {
          await importApi.bulkApproveMatches(uploadedFile.id, matchType, threshold);
          // Refresh preview data
          get().loadPreviewData();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to bulk approve matches' });
        }
      },

      // Import job actions
      startImport: async (options = {}) => {
        const { uploadedFile, columnMappings } = get();
        if (!uploadedFile) return;

        set({ isImporting: true });
        try {
          const job = await importApi.startImport(uploadedFile.id, columnMappings, options);
          set({ 
            currentJob: job,
            // Remove automatic step progression - user must manually advance
          });
          
          // Start progress subscription
          get().subscribeToProgress();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to start import' });
        } finally {
          set({ isImporting: false });
        }
      },

      cancelImport: async () => {
        const { currentJob } = get();
        if (!currentJob) return;

        try {
          await importApi.cancelImportJob(currentJob.id);
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to cancel import' });
        }
      },

      retryImport: async () => {
        const { currentJob } = get();
        if (!currentJob) return;

        set({ isImporting: true });
        try {
          const job = await importApi.retryImportJob(currentJob.id);
          set({ currentJob: job });
          get().subscribeToProgress();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to retry import' });
        } finally {
          set({ isImporting: false });
        }
      },

      subscribeToProgress: () => {
        const { currentJob } = get();
        if (!currentJob) return () => {};

        const unsubscribe = importApi.subscribeToImportProgress(currentJob.id, (job) => {
          set({ currentJob: job });
          
          // Remove automatic step progression - user must manually advance to complete step
          if (job.status === 'failed' || job.status === 'cancelled') {
            set({ isImporting: false });
          }
        });

        return unsubscribe;
      },

      // Navigation actions
      goToStep: (step: ImportWorkflowState['currentStep']) => {
        set({ currentStep: step });
      },

      nextStep: () => {
        const { currentStep } = get();
        const steps: ImportWorkflowState['currentStep'][] = ['upload', 'analysis', 'ai-processing', 'mapping', 'validation', 'preview', 'import', 'complete'];
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex < steps.length - 1) {
          set({ currentStep: steps[currentIndex + 1] });
        }
      },

      previousStep: () => {
        const { currentStep } = get();
        const steps: ImportWorkflowState['currentStep'][] = ['upload', 'analysis', 'ai-processing', 'mapping', 'validation', 'preview', 'import', 'complete'];
        const currentIndex = steps.indexOf(currentStep);
        
        if (currentIndex > 0) {
          // Handle special cases for workflow branching
          if (currentStep === 'validation') {
            // From validation, go back to mapping or ai-processing depending on which was used
            const { columnMappings } = get();
            if (columnMappings.length > 0) {
              // If we have mappings, check if they came from AI or manual
              set({ currentStep: 'mapping' }); // Default to mapping
            } else {
              set({ currentStep: 'analysis' }); // Go back to analysis to choose method
            }
          } else if (currentStep === 'mapping') {
            // From mapping, always go back to analysis
            set({ currentStep: 'analysis' });
          } else if (currentStep === 'ai-processing') {
            // From AI processing, go back to analysis
            set({ currentStep: 'analysis' });
          } else {
            // For other steps, just go to previous step
            set({ currentStep: steps[currentIndex - 1] });
          }
        }
      },

      resetWorkflow: () => {
        const { uploadedFile } = get();
        if (uploadedFile) {
          importApi.deleteFile(uploadedFile.id).catch(console.error);
        }
        set(initialState);
      },

      // Utility actions
      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null, uploadError: null });
      },

      clearUploadError: () => {
        set({ uploadError: null });
      },

      setProgress: (progress: number) => {
        set({ progress });
      },

      setCurrentStage: (currentStage: string) => {
        set({ currentStage });
      },
    }),
    {
      name: 'import-store',
    }
  )
);