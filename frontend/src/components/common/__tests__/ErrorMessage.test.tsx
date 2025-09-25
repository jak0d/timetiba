import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorMessage } from '../ErrorMessage';

describe('ErrorMessage', () => {
  it('renders with default title and error severity', () => {
    const message = 'Something went wrong';
    render(<ErrorMessage message={message} />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    const customTitle = 'Validation Error';
    const message = 'Invalid input provided';
    render(<ErrorMessage title={customTitle} message={message} />);
    
    expect(screen.getByText(customTitle)).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('renders with different severity levels', () => {
    const message = 'This is a warning';
    render(<ErrorMessage message={message} severity="warning" />);
    
    expect(screen.getByText(message)).toBeInTheDocument();
    // The alert should have warning styling (would need more specific testing for visual aspects)
  });

  it('renders success message', () => {
    const message = 'Operation completed successfully';
    render(<ErrorMessage message={message} severity="success" title="Success" />);
    
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });
});