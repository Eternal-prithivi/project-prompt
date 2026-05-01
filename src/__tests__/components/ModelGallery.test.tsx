import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelGallery } from '../../components/ModelGallery';

describe('ModelGallery', () => {
  const onClose = vi.fn();
  const onModelSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(<ModelGallery isOpen={false} onClose={onClose} onModelSelect={onModelSelect} />);

    expect(screen.queryByText(/Model Gallery/i)).not.toBeInTheDocument();
  });

  it('detects installed variants and dynamically adds custom models', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: 'qwen2.5:14b-instruct-q4_K_M' },
          { name: 'custom-model:latest' },
        ],
      }),
    });

    render(
      <ModelGallery
        isOpen={true}
        onClose={onClose}
        suggestedModel="qwen2.5:14b-instruct-q4_K_M"
        onModelSelect={onModelSelect}
      />
    );

    expect((await screen.findAllByText('qwen2.5:14b-instruct-q4_K_M')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('custom-model:latest').length).toBeGreaterThan(0);
    expect(screen.getByText(/Custom installed model/i)).toBeInTheDocument();
  });

  it('lets users select a downloaded model', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ name: 'deepseek-r1:7b' }],
      }),
    });

    render(
      <ModelGallery
        isOpen={true}
        onClose={onClose}
        suggestedModel="deepseek-r1:7b"
        onModelSelect={onModelSelect}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /use/i }));

    expect(onModelSelect).toHaveBeenCalledWith('deepseek-r1:7b');
    expect(screen.getByText(/Using model:/i)).toHaveTextContent('deepseek-r1:7b');
  });

  it('shows download progress and marks a model as downloaded once the stream finishes', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/api/tags')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ models: [] }),
        });
      }

      return Promise.resolve({
        ok: true,
        body: {
          getReader() {
            const chunks = [new Uint8Array(1024), new Uint8Array(2048)];
            let index = 0;
            return {
              read: vi.fn(async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                if (index < chunks.length) {
                  return { done: false, value: chunks[index++] };
                }
                return { done: true, value: undefined };
              }),
            };
          },
        },
      });
    });
    global.fetch = fetchMock as any;

    render(
      <ModelGallery
        isOpen={true}
        onClose={onClose}
        suggestedModel="tinyllama:latest"
        onModelSelect={onModelSelect}
      />
    );

    fireEvent.click(await screen.findAllByRole('button', { name: /download/i }).then((buttons) => buttons[0]));

    expect(await screen.findByText(/Downloading\.\.\./i)).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:11434/api/pull',
        expect.objectContaining({ method: 'POST' })
      );
    });
    expect(await screen.findAllByText(/Downloaded/i)).not.toHaveLength(0);
    expect(screen.getByText(/Using model:/i)).toHaveTextContent('tinyllama:latest');
  });

  it('deletes downloaded models and returns them to the download state', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/api/tags')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ models: [{ name: 'tinyllama:latest' }] }),
        });
      }

      return Promise.resolve({ ok: true });
    });
    global.fetch = fetchMock as any;

    render(
      <ModelGallery
        isOpen={true}
        onClose={onClose}
        suggestedModel="tinyllama:latest"
        onModelSelect={onModelSelect}
      />
    );

    const deleteButton = await screen.findByRole('button', { name: /delete/i });
    expect(screen.getAllByRole('button', { name: /download/i }).length).toBe(6);
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:11434/api/delete',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
    expect((await screen.findAllByRole('button', { name: /download/i })).length).toBe(7);
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('stays usable when loading installed models fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<ModelGallery isOpen={true} onClose={onClose} onModelSelect={onModelSelect} />);

    expect(await screen.findByText(/Model Gallery/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close model gallery/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
