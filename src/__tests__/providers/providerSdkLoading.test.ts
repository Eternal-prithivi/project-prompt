import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const providerFiles = [
  'src/services/providers/geminiProvider.ts',
  'src/services/providers/chatgptProvider.ts',
  'src/services/providers/claudeProvider.ts',
  'src/services/providers/grokProvider.ts',
];

describe('provider SDK loading policy', () => {
  it('does not statically import heavyweight cloud SDKs in provider modules', () => {
    for (const file of providerFiles) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');

      expect(source, file).not.toMatch(/import\s+.*from ['"]@google\/genai['"]/);
      expect(source, file).not.toMatch(/import\s+.*from ['"]openai['"]/);
      expect(source, file).not.toMatch(/import\s+.*from ['"]@anthropic-ai\/sdk['"]/);
    }
  });
});
