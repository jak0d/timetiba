import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';

describe('Dashboard', () => {
  it('renders dashboard title', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders welcome message', () => {
    render(<Dashboard />);
    
    expect(screen.getByText(/Welcome to AI Timetabler/)).toBeInTheDocument();
  });

  it('renders statistics cards', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('Active Timetables')).toBeInTheDocument();
    expect(screen.getByText('Venues')).toBeInTheDocument();
    expect(screen.getByText('Lecturers')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
  });

  it('displays correct statistics values', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('3')).toBeInTheDocument(); // Active Timetables
    expect(screen.getByText('25')).toBeInTheDocument(); // Venues
    expect(screen.getByText('45')).toBeInTheDocument(); // Lecturers
    expect(screen.getByText('120')).toBeInTheDocument(); // Courses
  });
});