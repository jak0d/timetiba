import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUploadComponent } from '../FileUploadComponent';

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn()
}));

const mockUseDropzone = require('react-dropzone').useDropzone as jest.Mock;

describe('FileUploadComponent', () => {
  const mockOnFileUpload = jest.fn();
  const mockOnFileRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDropzone.mockReturnValue({
      getRootProps: () => ({ 'data-testid': 'dropzone' }),
      getInputProps: () => ({ 'data-testid': 'file-input' }),
      isDragActive: false
    });
  });

  it('renders upload area with correct text', () => {
    render(
      <FileUploadComponent
        onFileUpload={mockOnFileUpload}
        onFileRemove={mockOnFileRemove}
      />
    );

    expect(screen.getByText('Drag & drop files here, or click to select')).toBeInTheDocument();
    expect(screen.getByText('Supported formats: .csv, .xlsx, .xls')).toBeInTheDocument();
    expect(screen.getByText('Maximum file size: 10 MB')).toBeInTheDocument();
  });

  it('shows drag active state', () => {
    mockUseDropzone.mockReturnValue({
      getRootProps: () => ({ 'data-testid': 'dropzone' }),
      getInputProps: () => ({ 'data-testid': 'file-input' }),
      isDragActive: true
    });

    render(
      <FileUploadComponent
        onFileUpload={mockOnFileUpload}
        onFileRemove={mockOnFileRemove}
      />
    );

    expect(screen.getByText('Drop files here...')).toBeInTheDocument();
  });

  it('calls onFileUpload when files are dropped', async () => {
    const mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' });
    mockOnFileUpload.mockResolvedValue(undefined);

    mockUseDropzone.mockImplementation(({ onDrop }) => {
      // Simulate file drop
      setTimeout(() => onDrop([mockFile]), 0);
      
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false
      };
    });

    render(
      <FileUploadComponent
        onFileUpload={mockOnFileUpload}
        onFileRemove={mockOnFileRemove}
      />
    );

    await waitFor(() => {
      expect(mockOnFileUpload).toHaveBeenCalledWith(mockFile);
    });
  });

  it('displays uploaded file with metadata', async () => {
    const mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' });
    mockOnFileUpload.mockResolvedValue(undefined);

    mockUseDropzone.mockImplementation(({ onDrop }) => {
      setTimeout(() => onDrop([mockFile]), 0);
      
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false
      };
    });

    render(
      <FileUploadComponent
        onFileUpload={mockOnFileUpload}
        onFileRemove={mockOnFileRemove}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument();
      expect(screen.getByText('Uploaded Files')).toBeInTheDocument();
    });
  });

  it('handles upload errors', async () => {
    const mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' });
    const errorMessage = 'Upload failed';
    mockOnFileUpload.mockRejectedValue(new Error(errorMessage));

    mockUseDropzone.mockImplementation(({ onDrop }) => {
      setTimeout(() => onDrop([mockFile]), 0);
      
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false
      };
    });

    render(
      <FileUploadComponent
        onFileUpload={mockOnFileUpload}
        onFileRemove={mockOnFileRemove}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('allows file removal', async () => {
    const mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' });
    mockOnFileUpload.mockResolvedValue(undefined);

    mockUseDropzone.mockImplementation(({ onDrop }) => {
      setTimeout(() => onDrop([mockFile]), 0);
      
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false
      };
    });

    render(
      <FileUploadComponent
        onFileUpload={mockOnFileUpload}
        onFileRemove={mockOnFileRemove}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(mockOnFileRemove).toHaveBeenCalled();
  });

  it('respects custom accepted formats', () => {
    render(
      <FileUploadComponent
        onFileUpload={mockOnFileUpload}
        onFileRemove={mockOnFileRemove}
        acceptedFormats={['.csv']}
      />
    );

    expect(screen.getByText('Supported formats: .csv')).toBeInTheDocument();
  });

  it('respects custom max size', () => {
    const customMaxSize = 5 * 1024 * 1024; // 5MB
    
    render(
      <FileUploadComponent
        onFileUpload={mockOnFileUpload}
        onFileRemove={mockOnFileRemove}
        maxSize={customMaxSize}
      />
    );

    expect(screen.getByText('Maximum file size: 5 MB')).toBeInTheDocument();
  });
});