import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HelpDashboard } from '../../components/HelpDashboard';

describe('HelpDashboard', () => {
  it('renders correctly and defaults to Getting Started tab', () => {
    const mockOnClose = vi.fn();
    render(<HelpDashboard onClose={mockOnClose} />);

    expect(screen.getByText('Help & User Guide')).toBeInTheDocument();
    
    // Check if the Getting Started content is visible
    expect(screen.getByText('1. Configure a Provider')).toBeInTheDocument();
  });

  it('switches tabs correctly', async () => {
    const mockOnClose = vi.fn();
    render(<HelpDashboard onClose={mockOnClose} />);

    // Click Core Features tab
    fireEvent.click(screen.getByText('Core Features'));
    expect(await screen.findByText('Battle Arena')).toBeInTheDocument();
    expect(screen.getByText('Token Compression')).toBeInTheDocument();

    // Click Privacy & Data tab
    fireEvent.click(screen.getByText('Privacy & Data'));
    expect(await screen.findByText('Local-First Architecture')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = vi.fn();
    render(<HelpDashboard onClose={mockOnClose} />);
    
    const closeButtons = screen.getAllByRole('button');
    // The X button is the first button in the component
    fireEvent.click(closeButtons[0]);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
