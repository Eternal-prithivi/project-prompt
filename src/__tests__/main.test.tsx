import { describe, expect, it, vi } from 'vitest';

describe('main entrypoint', () => {
  it('mounts the React app into the root element', async () => {
    vi.resetModules();

    document.body.innerHTML = '<div id="root"></div>';
    const render = vi.fn();
    const createRoot = vi.fn(() => ({ render }));

    vi.doMock('react-dom/client', () => ({
      createRoot,
    }));

    vi.doMock('../App.tsx', () => ({
      default: () => <div>App Stub</div>,
    }));

    await import('../main');

    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(render).toHaveBeenCalledTimes(1);
  });
});
