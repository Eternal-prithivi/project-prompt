import { describe, expect, it } from 'vitest';
import { manualChunks } from '../../../vite.config';

describe('vite manual chunk policy', () => {
  it('splits heavyweight provider SDKs into named vendor chunks', () => {
    expect(manualChunks('/repo/node_modules/@google/genai/dist/index.mjs')).toBe(
      'vendor-google-genai'
    );
    expect(manualChunks('/repo/node_modules/openai/index.mjs')).toBe('vendor-openai');
    expect(manualChunks('/repo/node_modules/@anthropic-ai/sdk/index.mjs')).toBe(
      'vendor-anthropic'
    );
  });

  it('keeps app source in Rollup automatic chunks', () => {
    expect(manualChunks('/repo/src/components/Wizard.tsx')).toBeUndefined();
  });

  it('splits shared runtime libraries away from app code', () => {
    expect(manualChunks('/repo/node_modules/react/index.js')).toBe('vendor-react');
    expect(manualChunks('/repo/node_modules/react-dom/client.js')).toBe('vendor-react');
    expect(manualChunks('/repo/node_modules/motion/dist/react.mjs')).toBe('vendor-motion');
    expect(manualChunks('/repo/node_modules/lucide-react/dist/esm/icons/sparkles.js')).toBe(
      'vendor-icons'
    );
    expect(manualChunks('/repo/node_modules/crypto-js/index.js')).toBe('vendor-crypto');
  });
});
