/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ollama Local LLM Provider
 * Implements ILLMProvider interface using local Ollama server (100% free, completely offline)
 */

import { ILLMProvider } from '../types/ILLMProvider';
import { PromptComponents, PromptVariation, JudgeVerdict } from '../../types';
import { fetchWithTimeout } from '../utils/timeout';
import { retry, isRetryableStatus } from '../utils/retry';

type ProviderTimeoutOptions = {
  timeoutMs?: number;
};

export class OllamaProvider implements ILLMProvider {
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;
  private tagsCache: { ts: number; models: { name: string }[] } | null = null;
  private tagsCacheTtlMs = 30_000;

  constructor(
    baseUrl: string = 'http://localhost:11434',
    model: string = 'deepseek-r1:7b',
    opts: ProviderTimeoutOptions = {}
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.model = model;
    this.timeoutMs = opts.timeoutMs ?? 30000;
  }

  /**
   * Resolve a bare model name (e.g. "deepseek-r1") to the full tagged name
   * actually installed in Ollama (e.g. "deepseek-r1:7b").
   * If the name already contains a tag, or Ollama is unreachable, it is returned as-is.
   */
  private async getTagsCached(): Promise<{ name: string }[] | null> {
    const now = Date.now();
    if (this.tagsCache && now - this.tagsCache.ts < this.tagsCacheTtlMs) {
      return this.tagsCache.models;
    }

    try {
      const res = await retry(async () => {
        const response = await fetchWithTimeout(`${this.baseUrl}/api/tags`, {}, 5000);
        if (!response.ok && isRetryableStatus(response.status)) {
          const err: any = new Error(`Ollama transient HTTP ${response.status}`);
          err.status = response.status;
          throw err;
        }
        return response;
      }, { maxAttempts: 2, baseDelayMs: 250, maxDelayMs: 1200 });

      if (!res.ok) return null;
      const data = await res.json();
      const models = (data.models as { name: string }[] | undefined) ?? [];
      this.tagsCache = { ts: now, models };
      return models;
    } catch {
      return null;
    }
  }

  private async resolveModel(name: string): Promise<string> {
    if (name.includes(':')) return name; // already tagged
    try {
      const models = await this.getTagsCached();
      if (!models || models.length === 0) return name;
      const match = models.find((m) => m.name.split(':')[0] === name);
      return match?.name ?? name;
    } catch {
      return name;
    }
  }

  private async makeRequest(prompt: string, model: string = this.model): Promise<string> {
    try {
      // Resolve bare names like "deepseek-r1" → "deepseek-r1:7b" so Ollama
      // doesn't return 404 for models saved without an explicit tag.
      const resolvedModel = await this.resolveModel(model);

      // Use /api/chat (messages format) — supported by all Ollama models including llama3.x.
      // /api/generate was returning 404 for newer models like llama3.1:8b.
      const response = await retry(async () => {
        const res = await fetchWithTimeout(
          `${this.baseUrl}/api/chat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: resolvedModel,
              messages: [{ role: 'user', content: prompt }],
              stream: false,
            }),
          },
          this.timeoutMs
        );
        if (!res.ok && isRetryableStatus(res.status)) {
          const err: any = new Error(`Ollama transient HTTP ${res.status}`);
          err.status = res.status;
          throw err;
        }
        return res;
      }, { maxAttempts: 2, baseDelayMs: 250, maxDelayMs: 1500 });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Ollama API error (${response.status})${errorText ? ': ' + errorText : ''}`);
      }

      const data = await response.json();
      // /api/chat returns data.message.content
      return data.message?.content || data.response || '';
    } catch (e: any) {
      throw new Error(`Failed to connect to Ollama at ${this.baseUrl}: ${e.message}`);
    }
  }

  private parseJSON(text: string): any {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }

  async analyzePrompt(input: string): Promise<PromptComponents> {
    const prompt = `Analyze this prompt and provide JSON with: role, task, context, format, constraints, scores (clarity, context, constraints, tone, overall, feedback), questions (array).

Prompt: "${input}"

Respond with only JSON.`;

    try {
      const response = await this.makeRequest(prompt);
      const parsed = this.parseJSON(response);

      if (parsed && parsed.role) {
        return { ...parsed, customPersona: '' };
      }

      // Fallback if parsing fails
      return {
        role: 'Assistant',
        task: input,
        context: 'User prompt analysis',
        format: 'JSON response',
        constraints: 'None specified',
        customPersona: '',
      };
    } catch {
      return {
        role: 'Assistant',
        task: input,
        context: 'User prompt analysis',
        format: 'JSON response',
        constraints: 'None specified',
        customPersona: '',
      };
    }
  }

  async generateVariations(components: PromptComponents): Promise<PromptVariation[]> {
    const customInstruction = components.customPersona ? `\n4. Custom persona: "${components.customPersona}"` : '';

    const prompt = `Generate 3 prompt variations. Return JSON array with: id, type, title, description, content.
Types: precisionist, creative, mastermind${customInstruction}

Base prompt:
Role: ${components.role}
Task: ${components.task}
Context: ${components.context}
Format: ${components.format}
Constraints: ${components.constraints}

Respond with only JSON array.`;

    try {
      const response = await this.makeRequest(prompt);
      const parsed = this.parseJSON(response);

      if (Array.isArray(parsed)) {
        return parsed.map((v, i) => ({ ...v, id: String(i) })) as PromptVariation[];
      }

      // Fallback variations
      return [
        {
          id: '0',
          type: 'precisionist',
          title: 'Professional',
          description: 'Structured approach',
          content: `Role: ${components.role}\nTask: ${components.task}\nConstraints: ${components.constraints}`,
        },
        {
          id: '1',
          type: 'creative',
          title: 'Creative',
          description: 'Imaginative approach',
          content: `Imagine you are a ${components.role}. Your task is to ${components.task}.`,
        },
        {
          id: '2',
          type: 'mastermind',
          title: 'Expert',
          description: 'Advanced reasoning',
          content: `As an expert ${components.role}, analyze this: ${components.task}. Context: ${components.context}`,
        },
      ];
    } catch {
      return [
        {
          id: '0',
          type: 'precisionist',
          title: 'Professional',
          description: 'Structured approach',
          content: `Role: ${components.role}\nTask: ${components.task}\nConstraints: ${components.constraints}`,
        },
        {
          id: '1',
          type: 'creative',
          title: 'Creative',
          description: 'Imaginative approach',
          content: `Imagine you are a ${components.role}. Your task is to ${components.task}.`,
        },
        {
          id: '2',
          type: 'mastermind',
          title: 'Expert',
          description: 'Advanced reasoning',
          content: `As an expert ${components.role}, analyze this: ${components.task}. Context: ${components.context}`,
        },
      ];
    }
  }

  async magicRefine(components: PromptComponents): Promise<PromptComponents> {
    const prompt = `Improve and enhance this prompt structure. Return JSON with same fields: role, task, context, format, constraints.

Current:
Role: ${components.role}
Task: ${components.task}
Context: ${components.context}
Format: ${components.format}
Constraints: ${components.constraints}

Respond with only improved JSON.`;

    const response = await this.makeRequest(prompt);
    const parsed = this.parseJSON(response);

    if (parsed && parsed.role) {
      return { ...parsed, customPersona: components.customPersona, scores: components.scores };
    }

    return components;
  }

  async integrateAnswers(
    components: PromptComponents,
    qas: { q: string; a: string }[]
  ): Promise<PromptComponents> {
    const qaString = qas.map((qa) => `Q: ${qa.q}\nA: ${qa.a}`).join('\n\n');

    const prompt = `Integrate these user answers into the prompt. Return improved JSON with: role, task, context, format, constraints.

Answers:
${qaString}

Current:
Role: ${components.role}
Task: ${components.task}
Context: ${components.context}
Format: ${components.format}
Constraints: ${components.constraints}

Respond with only JSON.`;

    const response = await this.makeRequest(prompt);
    const parsed = this.parseJSON(response);

    if (parsed && parsed.role) {
      return { ...parsed, customPersona: components.customPersona, scores: components.scores };
    }

    return components;
  }

  async generateExamples(components: PromptComponents): Promise<string> {
    const prompt = `Generate 2 few-shot examples in markdown format:

Task: ${components.task}
Context: ${components.context}
Format: ${components.format}

Use format:
### Example 1
**Input:** ...
**Output:** ...

### Example 2
**Input:** ...
**Output:** ...`;

    return await this.makeRequest(prompt);
  }

  async runPrompt(promptText: string, model: string = this.model): Promise<string> {
    return await this.makeRequest(promptText, model);
  }

  async compressPrompt(promptText: string): Promise<string> {
    const prompt = `Compress this prompt to minimum length without losing meaning. Keep [VARIABLES] intact.

Original:
${promptText}

Respond with only the compressed prompt.`;

    const response = await this.makeRequest(prompt);
    return response.trim() || promptText;
  }

  async judgeArenaOutputs(
    components: PromptComponents,
    promptA: string,
    outA: string,
    promptB: string,
    outB: string
  ): Promise<JudgeVerdict> {
    try {
      const prompt = `Judge which prompt performed better. Return JSON: { "winner": "A" or "B" or "TIE", "reasoning": "..." }

REQUIREMENTS:
Role: ${components.role}
Task: ${components.task}
Format: ${components.format}

ATTEMPT A:
Prompt: ${promptA}
Output: ${outA}

ATTEMPT B:
Prompt: ${promptB}
Output: ${outB}

Respond with only JSON.`;

      const response = await this.makeRequest(prompt);
      const parsed = this.parseJSON(response);

      if (parsed && parsed.winner) {
        return {
          winner: (parsed.winner.toUpperCase() || 'TIE') as 'A' | 'B' | 'TIE',
          reasoning: parsed.reasoning || 'No reasoning provided.',
        };
      }

      return { winner: 'TIE', reasoning: 'Could not determine winner.' };
    } catch (e: any) {
      return { winner: 'TIE', reasoning: 'Judge error: ' + (e?.message || 'Unknown error') };
    }
  }
}
