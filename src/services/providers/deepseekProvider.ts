/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DeepSeek LLM Provider
 * Implements ILLMProvider interface using DeepSeek's OpenAI-compatible API
 */

import { ILLMProvider } from '../types/ILLMProvider';
import { PromptComponents, PromptVariation, JudgeVerdict } from '../../types';
import { fetchWithTimeout } from '../utils/timeout';

type ProviderTimeoutOptions = {
  timeoutMs?: number;
};

export class DeepseekProvider implements ILLMProvider {
  private apiKey: string;
  private baseUrl = 'https://api.deepseek.com/v1';
  private timeoutMs: number;

  constructor(apiKey: string, opts: ProviderTimeoutOptions = {}) {
    if (!apiKey || apiKey === 'undefined') {
      throw new Error('DeepSeek API key is required. Please provide a valid API key.');
    }
    this.apiKey = apiKey;
    this.timeoutMs = opts.timeoutMs ?? 30000;
  }

  private async makeRequest(
    endpoint: string,
    messages: any[],
    model: string = 'deepseek-chat',
    timeoutMs?: number
  ): Promise<string> {
    const request = () => fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: 'json_object' },
        temperature: 1,
      }),
    });
    const response = timeoutMs != null
      ? await fetchWithTimeout(
          `${this.baseUrl}${endpoint}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages,
              response_format: { type: 'json_object' },
              temperature: 1,
            }),
          },
          timeoutMs
        )
      : await request();

    if (!response.ok) {
      const error = typeof (response as any).text === 'function' ? await response.text() : '';
      throw new Error(`DeepSeek API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private cleanJSON(text: string): string {
    if (!text) return '';
    return text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  }

  private parseJSON<T>(text: string, fallback: T): T {
    try {
      return JSON.parse(this.cleanJSON(text || '')) as T;
    } catch {
      return fallback;
    }
  }

  async analyzePrompt(input: string): Promise<PromptComponents> {
    const response = await this.makeRequest('/chat/completions', [
      {
        role: 'user',
        content: `Analyze this basic prompt and extract components: Role, Task, Context, Format, Constraints.
Score the original prompt out of 100 on clarity, context, constraints, tone.
Generate exactly 3 questions the user should answer.
Return as JSON.

Prompt: "${input}"`,
      },
    ], 'deepseek-chat', this.timeoutMs);

    const parsed = this.parseJSON<PromptComponents>(response || '{}', {} as any);
    return { ...(parsed || ({} as any)), customPersona: '' };
  }

  async generateVariations(components: PromptComponents): Promise<PromptVariation[]> {
    const customInstruction = components.customPersona
      ? `\n4. Custom: Write it as a "${components.customPersona}".`
      : '';

    const response = await this.makeRequest('/chat/completions', [
      {
        role: 'user',
        content: `Generate 3 prompt variations:
Role: ${components.role}
Task: ${components.task}
Context: ${components.context}
Format: ${components.format}
Constraints: ${components.constraints}

Return as JSON array with: id, type, title, description, content
Include variables like [UPPERCASE_WORD]${customInstruction}`,
      },
    ], 'deepseek-chat', this.timeoutMs);

    const variations = this.parseJSON<any[]>(response || '[]', []);
    return variations.map((v, i) => ({ ...v, id: String(i) })) as PromptVariation[];
  }

  async magicRefine(components: PromptComponents): Promise<PromptComponents> {
    const response = await this.makeRequest('/chat/completions', [
      {
        role: 'user',
        content: `Enhance and expand this prompt structure professionally:
Role: ${components.role}
Task: ${components.task}
Context: ${components.context}
Format: ${components.format}
Constraints: ${components.constraints}

Return improved version as JSON with same fields.`,
      },
    ], 'deepseek-chat', this.timeoutMs);

    const parsed = this.parseJSON<PromptComponents>(response || '{}', {} as any);
    return { ...parsed, customPersona: components.customPersona, scores: components.scores };
  }

  async integrateAnswers(
    components: PromptComponents,
    qas: { q: string; a: string }[]
  ): Promise<PromptComponents> {
    const qaString = qas.map((qa) => `Q: ${qa.q}\nA: ${qa.a}`).join('\n\n');

    const response = await this.makeRequest('/chat/completions', [
      {
        role: 'user',
        content: `Integrate these user answers into the prompt structure:
${qaString}

Current structure:
Role: ${components.role}
Task: ${components.task}
Context: ${components.context}
Format: ${components.format}
Constraints: ${components.constraints}

Return updated structure as JSON.`,
      },
    ], 'deepseek-chat', this.timeoutMs);

    const parsed = this.parseJSON<PromptComponents>(response || '{}', {} as any);
    return { ...parsed, customPersona: components.customPersona, scores: components.scores };
  }

  async generateExamples(components: PromptComponents): Promise<string> {
    const response = await this.makeRequest('/chat/completions', [
      {
        role: 'user',
        content: `Generate 2 few-shot examples for:
Task: ${components.task}
Context: ${components.context}
Format: ${components.format}

Return as markdown: ### Example 1\\n**Input:** ...\\n**Output:** ...`,
      },
    ], 'deepseek-chat', this.timeoutMs);

    return response.trim() || '';
  }

  async runPrompt(promptText: string, model: string = 'deepseek-chat'): Promise<string> {
    const response = await this.makeRequest('/chat/completions', [
      { role: 'user', content: promptText },
    ], model, this.timeoutMs);

    return response;
  }

  async compressPrompt(promptText: string): Promise<string> {
    try {
      const response = await this.makeRequest('/chat/completions', [
        {
          role: 'user',
          content: `Compress this prompt to minimum tokens without losing meaning or [VARIABLES]:

${promptText}

Return only the compressed prompt, no explanation.`,
        },
      ], 'deepseek-chat', this.timeoutMs);

      return response.trim() || promptText;
    } catch {
      return promptText;
    }
  }

  async judgeArenaOutputs(
    components: PromptComponents,
    promptA: string,
    outA: string,
    promptB: string,
    outB: string
  ): Promise<JudgeVerdict> {
    try {
      const response = await this.makeRequest('/chat/completions', [
        {
          role: 'user',
          content: `Judge which prompt is better:

REQUIREMENTS:
Role: ${components.role}
Task: ${components.task}
Context: ${components.context}
Format: ${components.format}
Constraints: ${components.constraints}

ATTEMPT A:
Prompt: ${promptA}
Output: ${outA}

ATTEMPT B:
Prompt: ${promptB}
Output: ${outB}

Return JSON: { "winner": "A" or "B" or "TIE", "reasoning": "..." }`,
        },
      ], 'deepseek-chat', this.timeoutMs);

      const parsed = JSON.parse(this.cleanJSON(response || '{}'));
      return {
        winner: (parsed.winner?.toUpperCase() || 'TIE') as 'A' | 'B' | 'TIE',
        reasoning: parsed.reasoning || 'No reasoning provided.',
      };
    } catch (e: any) {
      return { winner: 'TIE', reasoning: 'Judge error: ' + (e?.message || 'Unknown error') };
    }
  }
}
