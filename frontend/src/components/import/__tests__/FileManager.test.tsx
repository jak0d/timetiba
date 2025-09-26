import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileManager } from '../FileManager';

// Mock file data for testing
const mockFiles = [
  {
    id: '1',
    filename: 'test-file.csv',
    size: 1024,
    status: 'ready' as const,
    progress: 100,
    uploadedAt: new Date('2024-01-15T10:30:00'),
    metadata: {
      rows: 100,
      columns: ['Name', 'Email', 'Department'],
      preview: [{ Name: 'John', Email: 'john@test.com', Department: 'IT' }],
      fileType: 'CSV'
    }
  },
  {
    id: '2',
    filename: 'processing-file.xlsx',
    size: 2048,
    status: 'processing' as const,
    progress: 65,
    uploadedAt: new Date('2024-01-15T11:00:00'),
    metadata: {
      rows: 200,
      columns: ['Course', 'Lecturer', 'Room'],
      preview: [{ Course: 'Math 101', Lecturer: 'Dr. Smith', Room: 'A-101' }],
      fileType: 'XLSX'
    }
  }
];

const mockProps = {
  files: mockFiles,
  onFileUpload: jest.fn(),
  onFileDelete: jest.fn(),
  onFileReplace: jest.fn(),
  onFileSelect: jest.fn(),
  selectedFileId: '1',
  maxFiles: 5,
  acceptedFormats: ['.csv', '.xlsx', '.xls'],
  maxSize: 10 * 1024 * 1024
};

describe('FileManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders file manager with uploaded files', () => {
    render(<FileManager {...mockProps} />);
    
    expect(screen.getByText('test-file.csv')).toBeInTheDocument();
    expect(screen.getByText('processing-file.xlsx')).toBeInTheDocument();
    expect(screen.getByText('Uploaded Files (2/5)')).toBeInTheDocument();
  });

  it('shows file status correctly', () => {
    render(<FileManager {...mockProps} />);
    
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('displays file metadata', () => {
    render(<FileManager {...mockProps} />);
    
    expect(screen.getByText('100 rows')).toBeInTheDocument();
    expect(screen.getByText('3 columns')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
  });

  it('calls onFileSelect when file is clicked', () => {
    render(<FileManager {...mockProps} />);
    
    const fileItem = screen.getByText('processing-file.xlsx').closest('[role="button"]');
    if (fileItem) {
      fireEvent.click(fileItem);
      expect(mockProps.onFileSelect).toHaveBeenCalledWith('2');
    }
  });

  it('shows selected file with proper styling', () => {
    render(<FileManager {...mockProps} />);
    
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('opens file details when info button is clicked', async () => {
    render(<FileManager {...mockProps} />);
    
    const infoButtons = screen.getAllByLabelText('View details');
    fireEvent.click(infoButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('File Details')).toBeInTheDocument();
    });
  });

  it('shows upload area when under max files', () => {
    render(<FileManager {...mockProps} />);
    
    expect(screen.getByText('Add more files (2/5)')).toBeInTheDocument();
  });

  it('handles file upload', async () => {
    render(<FileManager {...mockProps} />);
    
    const file = new File(['test content'], 'new-file.csv', { type: 'text/csv' });
    const uploadArea = screen.getByText('Add more files (2/5)').closest('div');
    
    if (uploadArea) {
      const input = uploadArea.querySelector('input[type="file"]');
      if (input) {
        fireEvent.change(input, { target: { files: [file] } });
        expect(mockProps.onFileUpload).toHaveBeenCalledWith(file);
      }
    }
  });

  it('opens delete confirmation dialog', async () => {
    render(<FileManager {...mockProps} />);
    
    const moreButtons = screen.getAllByLabelText('More actions');
    fireEvent.click(moreButtons[0]);
    
    await waitFor(() => {
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Delete File')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this file? This action cannot be undone.')).toBeInTheDocument();
    });
  });

  it('confirms file deletion', async () => {
    render(<FileManager {...mockProps} />);
    
    const moreButtons = screen.getAllByLabelText('More actions');
    fireEvent.click(moreButtons[0]);
    
    await waitFor(() => {
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
    });
    
    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(confirmButton);
      expect(mockProps.onFileDelete).toHaveBeenCalledWith('1');
    });
  });

  it('handles file replacement', async () => {
    render(<FileManager {...mockProps} />);
    
    const moreButtons = screen.getAllByLabelText('More actions');
    fireEvent.click(moreButtons[0]);
    
    await waitFor(() => {
      const replaceButton = screen.getByText('Replace File');
      fireEvent.click(replaceButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Drop new file to replace')).toBeInTheDocument();
    });
  });

  it('formats file sizes correctly', () => {
    render(<FileManager {...mockProps} />);
    
    expect(screen.getByText('1 KB')).toBeInTheDocument();
    expect(screen.getByText('2 KB')).toBeInTheDocument();
  });

  it('shows progress bar for processing files', () => {
    render(<FileManager {...mockProps} />);
    
    // Check if progress indicators are present
    const progressElements = screen.getAllByRole('progressbar');
    expect(progressElements.length).toBeGreaterThan(0);
  });
});