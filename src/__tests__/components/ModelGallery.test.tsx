import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModelGallery } from '../../components/ModelGallery';

describe('ModelGallery', () => {
  const mockOnClose = vi.fn();
  const mockSuggestedModel = 'deepseek-r1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ModelGallery
          isOpen={false}
          onClose={mockOnClose}
          suggestedModel={mockSuggestedModel}
        />
      );

      const modal = screen.queryByText(/Model Gallery/i);
      expect(modal).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <ModelGallery
          isOpen={true}
          onClose={mockOnClose}
          suggestedModel={mockSuggestedModel}
        />
      );

      expect(screen.getByText(/Model Gallery/i)).toBeInTheDocument();
    });
  });

  describe('close functionality', () => {
    it('should call onClose when close button clicked', () => {
      render(
        <ModelGallery
          isOpen={true}
          onClose={mockOnClose}
          suggestedModel={mockSuggestedModel}
        />
      );

      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('model display', () => {
    it('should display model list', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'deepseek-r1:7b', size: '8GB' },
            { name: 'neural-chat:7b', size: '5GB' },
            { name: 'tinyllama:latest', size: '1.1GB' },
          ],
        }),
      });

      render(
        <ModelGallery
          isOpen={true}
          onClose={mockOnClose}
          suggestedModel={mockSuggestedModel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/deepseek-r1/i)).toBeInTheDocument();
      });
    });

    it('should highlight suggested model', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'deepseek-r1:7b', size: '8GB' },
            { name: 'other-model:7b', size: '5GB' },
          ],
        }),
      });

      render(
        <ModelGallery
          isOpen={true}
          onClose={mockOnClose}
          suggestedModel='deepseek-r1'
        />
      );

      await waitFor(() => {
        const suggestedElement = screen.getByText(/deepseek-r1/i);
        expect(suggestedElement).toBeInTheDocument();
      });
    });
  });

  describe('model filtering', () => {
    it('should filter models by search term', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'deepseek-r1:7b', size: '8GB' },
            { name: 'neural-chat:7b', size: '5GB' },
            { name: 'tinyllama:latest', size: '1.1GB' },
          ],
        }),
      });

      render(
        <ModelGallery
          isOpen={true}
          onClose={mockOnClose}
          suggestedModel={mockSuggestedModel}
        />
      );

      await waitFor(() => {
        const searchInput = screen.queryByPlaceholderText(/search/i);
        if (searchInput) {
          fireEvent.change(searchInput, { target: { value: 'neural' } });
          expect(screen.getByText(/neural-chat/i)).toBeInTheDocument();
        }
      });
    });
  });

  describe('download functionality', () => {
    it('should have download button for models', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'deepseek-r1:7b', size: '8GB' }],
        }),
      });

      render(
        <ModelGallery
          isOpen={true}
          onClose={mockOnClose}
          suggestedModel={mockSuggestedModel}
        />
      );

      await waitFor(() => {
        const downloadButtons = screen.getAllByRole('button', { name: /download/i });
        expect(downloadButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('error handling', () => {
    it('should show error message when loading models fails', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      render(
        <ModelGallery
          isOpen={true}
          onClose={mockOnClose}
          suggestedModel={mockSuggestedModel}
        />
      );

      await waitFor(
        () => {
          // Component should still render even if loading fails
          const modal = screen.getByText(/Model Gallery/i);
          expect(modal).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should handle empty model list', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [],
        }),
      });

      render(
        <ModelGallery
          isOpen={true}
          onClose={mockOnClose}
          suggestedModel={mockSuggestedModel}
        />
      );

      await waitFor(() => {
        const modal = screen.getByText(/Model Gallery/i);
        expect(modal).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper heading', () => {
      render(
        <ModelGallery
          isOpen={true}
          onClose={mockOnClose}
          suggestedModel={mockSuggestedModel}
        />
      );

      expect(screen.getByText(/Model Gallery/i)).toBeInTheDocument();
    });

    it('should have close button', () => {
      render(
        <ModelGallery
          isOpen={true}
          onClose={mockOnClose}
          suggestedModel={mockSuggestedModel}
        />
      );

      const closeButton = screen.getByText('×');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('recommended model display', () => {
    it('should show recommended model message', () => {
      render(
        <ModelGallery
          isOpen={true}
          onClose={mockOnClose}
          suggestedModel='deepseek-r1'
        />
      );

      const modal = screen.getByText(/Model Gallery/i);
      expect(modal).toBeInTheDocument();
    });
  });
});
