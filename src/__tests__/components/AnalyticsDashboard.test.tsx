import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsDashboard } from '../../components/AnalyticsDashboard';
import * as telemetryService from '../../services/utils/telemetryService';

vi.mock('../../services/utils/telemetryService', () => ({
  getTelemetryData: vi.fn(),
}));

describe('AnalyticsDashboard', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(telemetryService.getTelemetryData).mockReturnValue({
      totalPromptsRun: 15,
      totalTokensCompressed: 2500,
      estimatedCostSaved: 0.125,
      providerUsage: {
        gemini: 10,
        local: 5,
      },
      battleWins: {
        'gemini-1.5-flash': 3,
        'llama3': 1,
      },
    });
  });

  it('renders telemetry data correctly', () => {
    render(<AnalyticsDashboard onClose={mockOnClose} />);

    expect(screen.getByText('Analytics & Telemetry')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument(); // total prompts
    expect(screen.getByText('2,500')).toBeInTheDocument(); // tokens
    expect(screen.getByText('$0.125')).toBeInTheDocument(); // savings

    // Check provider usage
    expect(screen.getAllByText(/gemini/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/10 runs/i)).toBeInTheDocument();

    // Check battle leaderboard
    expect(screen.getByText('gemini-1.5-flash')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<AnalyticsDashboard onClose={mockOnClose} />);
    const closeButtons = screen.getAllByRole('button');
    // The X button is the first button in the component
    fireEvent.click(closeButtons[0]);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
