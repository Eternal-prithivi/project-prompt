import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ModelGallery } from '../../components/ModelGallery';

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('ModelGallery network integration', () => {
  it('loads installed Ollama models through the request layer with MSW', async () => {
    server.use(
      http.get('http://localhost:11434/api/tags', () =>
        HttpResponse.json({
          models: [
            { name: 'qwen2.5:14b-instruct-q4_K_M' },
            { name: 'custom-model:latest' },
          ],
        })
      )
    );

    render(
      <ModelGallery
        isOpen={true}
        onClose={vi.fn()}
        suggestedModel="qwen2.5:14b-instruct-q4_K_M"
        onModelSelect={vi.fn()}
      />
    );

    expect((await screen.findAllByText('qwen2.5:14b-instruct-q4_K_M')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('custom-model:latest').length).toBeGreaterThan(0);
    expect(screen.getByText(/Custom installed model/i)).toBeInTheDocument();
  });

  it('stays usable when the Ollama tags request fails', async () => {
    server.use(
      http.get(
        'http://localhost:11434/api/tags',
        () => HttpResponse.json({ message: 'unavailable' }, { status: 500 })
      )
    );

    render(
      <ModelGallery
        isOpen={true}
        onClose={vi.fn()}
        onModelSelect={vi.fn()}
      />
    );

    expect(await screen.findByText(/Model Gallery/i)).toBeInTheDocument();
  });
});
