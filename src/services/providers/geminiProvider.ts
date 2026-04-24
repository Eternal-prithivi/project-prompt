/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Google Gemini LLM Provider
 * Implements ILLMProvider interface using Google's Gemini API
 */

import { GoogleGenAI, Type } from '@google/genai';
import { ILLMProvider, ProviderConfig } from '../types/ILLMProvider';
import { PromptComponents, PromptVariation, JudgeVerdict } from '../../types';
import { timeoutPromise } from '../utils/timeout';
import { retry } from '../utils/retry';

type ProviderTimeoutOptions = {
  timeoutMs?: number;
};

export class GeminiProvider implements ILLMProvider {
  private aiClient: GoogleGenAI;
  private timeoutMs: number;

  constructor(apiKey: string, opts: ProviderTimeoutOptions = {}) {
    if (!apiKey || apiKey === 'undefined') {
      throw new Error('Gemini API key is required. Please provide a valid API key.');
    }
    this.timeoutMs = opts.timeoutMs ?? 30000;
    this.aiClient = new GoogleGenAI({ apiKey });
  }

  /**
   * Clean JSON responses from markdown code fences
   */
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

  private async callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    return retry(fn, { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 6000 });
  }

  async analyzePrompt(input: string): Promise<PromptComponents> {
    const response = await this.callWithRetry(() =>
      timeoutPromise(
        this.aiClient.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Analyze this basic prompt and extract or suggest these components: Role, Task, Context, Format, Constraints.
    ALSO, act as a Prompt Critic. Evaluate the original prompt out of 100 on clarity, context, constraints, and tone. Provide an overall score and a brief, blunt 1-sentence feedback.
    FINALLY, generate exactly 3 highly targeted questions for the user. Answering these questions should fill in the critical missing context to make this prompt world-class.
    Basic Prompt: "${input}"`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
              role: { type: Type.STRING },
              task: { type: Type.STRING },
              context: { type: Type.STRING },
              format: { type: Type.STRING },
              constraints: { type: Type.STRING },
              scores: {
                type: Type.OBJECT,
                properties: {
                  clarity: { type: Type.NUMBER },
                  context: { type: Type.NUMBER },
                  constraints: { type: Type.NUMBER },
                  tone: { type: Type.NUMBER },
                  overall: { type: Type.NUMBER },
                  feedback: { type: Type.STRING },
                },
                required: ['clarity', 'context', 'constraints', 'tone', 'overall', 'feedback'],
              },
              questions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['role', 'task', 'context', 'format', 'constraints', 'scores', 'questions'],
          },
        },
        }),
        this.timeoutMs,
        `Gemini request timed out after ${Math.round(this.timeoutMs / 1000)}s`
      )
    );

    const parsed = this.parseJSON<PromptComponents>(response.text || '{}', {} as any);
    return { ...(parsed || ({} as any)), customPersona: '' };
  }

  async generateVariations(components: PromptComponents): Promise<PromptVariation[]> {
    const customInstruction = components.customPersona
      ? `\n4. Custom: Write it specifically acting as a "${components.customPersona}".`
      : '';

    const response = await this.callWithRetry(() =>
      timeoutPromise(
        this.aiClient.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: `Generate world-class, highly structured prompt variations based on these components:
    Role: ${components.role}
    Task: ${components.task}
    Context: ${components.context}
    Format: ${components.format}
    Constraints: ${components.constraints}

    CRITICAL ADVANCED PROMPTING INSTRUCTIONS:
    1. You MUST use advanced formatting within the generated prompt itself (Markdown headers ##).
    2. Explicitly define the Persona/Role at the very beginning of every prompt variation.
    3. Use XML-style tags (e.g., <system_instructions>, <chain_of_thought>, <input_data>) inside the prompt logic.
    4. MUST INCLUDE VARIABLES: Identify missing specifics in the user's workflow and include variables formatted EXACTLY like [UPPERCASE_WORD_OR_UNDERSCORE] (e.g., [TARGET_AUDIENCE], [TOPIC], [INPUT_DATA]). No spaces inside the brackets.

    Output exactly these variations:
    1. Precisionist: Professional, highly structured, sticking strictly to requirements.
    2. Creative: Friendly, imaginative, goes beyond basic acceptance by adding creative depth. Includes a creative persona explicitly.
    3. Mastermind: Advanced, expert-level reasoning, complex chain-of-thought formatting (e.g., using <thinking> layers).${customInstruction}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
                required: ['type', 'title', 'description', 'content'],
              },
            },
          },
        }),
        this.timeoutMs,
        `Gemini request timed out after ${Math.round(this.timeoutMs / 1000)}s`
      )
    );

    const variations = this.parseJSON<any[]>(response.text || '[]', []);
    return variations.map((v, i) => ({ ...v, id: String(i) })) as PromptVariation[];
  }

  async magicRefine(components: PromptComponents): Promise<PromptComponents> {
    const response = await this.callWithRetry(() =>
      timeoutPromise(
        this.aiClient.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Act as an expert prompt engineer. Enhance and expand the missing details of this prompt structure.
    Keep the good parts, improve professional quality.
    Role: ${components.role}
    Task: ${components.task}
    Context: ${components.context}
    Format: ${components.format}
    Constraints: ${components.constraints}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                role: { type: Type.STRING },
                task: { type: Type.STRING },
                context: { type: Type.STRING },
                format: { type: Type.STRING },
                constraints: { type: Type.STRING },
              },
              required: ['role', 'task', 'context', 'format', 'constraints'],
            },
          },
        }),
        this.timeoutMs,
        `Gemini request timed out after ${Math.round(this.timeoutMs / 1000)}s`
      )
    );

    const parsed = this.parseJSON<PromptComponents>(response.text || '{}', {} as any);
    return { ...parsed, customPersona: components.customPersona, scores: components.scores };
  }

  async integrateAnswers(
    components: PromptComponents,
    qas: { q: string; a: string }[]
  ): Promise<PromptComponents> {
    const qaString = qas.map((qa) => `Question: ${qa.q}\nUser Answer: ${qa.a}`).join('\n\n');
    const response = await this.callWithRetry(() =>
      timeoutPromise(
        this.aiClient.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Act as an expert prompt engineer. You previously created this prompt structure:
    Role: ${components.role}
    Task: ${components.task}
    Context: ${components.context}
    Format: ${components.format}
    Constraints: ${components.constraints}

    The user has now provided critical clarifying answers:
    ${qaString}

    Elegantly rewrite and expand the prompt components to fully incorporate these new insights.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                role: { type: Type.STRING },
                task: { type: Type.STRING },
                context: { type: Type.STRING },
                format: { type: Type.STRING },
                constraints: { type: Type.STRING },
              },
              required: ['role', 'task', 'context', 'format', 'constraints'],
            },
          },
        }),
        this.timeoutMs,
        `Gemini request timed out after ${Math.round(this.timeoutMs / 1000)}s`
      )
    );

    const parsed = this.parseJSON<PromptComponents>(response.text || '{}', {} as any);
    return { ...parsed, customPersona: components.customPersona, scores: components.scores };
  }

  async generateExamples(components: PromptComponents): Promise<string> {
    const response = await this.callWithRetry(() =>
      timeoutPromise(
        this.aiClient.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Based on this prompt goal, generate 2 highly relevant 'Few-Shot' examples (Input and Expected Output formats) to help guide a language model perfectly.
    Task: ${components.task}
    Context: ${components.context}
    Format: ${components.format}

    Return ONLY the raw markdown for the examples (e.g., "### Example 1\\n**Input:** ... \\n**Output:** ..."). Do NOT include conversational filler, JSON, or any wrapper text.`,
        }),
        this.timeoutMs,
        `Gemini request timed out after ${Math.round(this.timeoutMs / 1000)}s`
      )
    );
    return response.text?.trim() || '';
  }

  async runPrompt(promptText: string, model: 'gemini-3.1-pro-preview' | 'gemini-3-flash-preview' = 'gemini-3.1-pro-preview'): Promise<string> {
    const response = await this.callWithRetry(() =>
      timeoutPromise(
        this.aiClient.models.generateContent({
          model,
          contents: promptText,
        }),
        this.timeoutMs,
        `Gemini request timed out after ${Math.round(this.timeoutMs / 1000)}s`
      )
    );
    return response.text || '';
  }

  async compressPrompt(promptText: string): Promise<string> {
    const response = await this.callWithRetry(() =>
      timeoutPromise(
        this.aiClient.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: `You are an expert prompt compression algorithm. Compress the following prompt to use the ABSOLUTE MINIMUM NUMBER OF TOKENS without losing ANY constraints, semantic meaning, or required output formats.
    Use dense formatting (e.g. Markdown, extreme abbreviation of pleasantries, succinct lists). Maintain bracketed [VARIABLES] exactly as they are.

    ORIGINAL PROMPT:
    ${promptText}`,
        }),
        this.timeoutMs,
        `Gemini request timed out after ${Math.round(this.timeoutMs / 1000)}s`
      )
    );
    return response.text?.trim() || promptText;
  }

  async judgeArenaOutputs(
    components: PromptComponents,
    promptA: string,
    outA: string,
    promptB: string,
    outB: string
  ): Promise<JudgeVerdict> {
    try {
      const response = await this.callWithRetry(() =>
        timeoutPromise(
          this.aiClient.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: `You are an impartial, highly rigorous AI Prompt Judge. I will provide you with the overarching constraints and goals of a task, and two different pairs of (Prompt, Output).
      Your goal is to evaluate which Prompt produced an output that better satisfied the requirements and achieved the highest quality formatting and tone.

      TASK REQUIREMENTS:
      Role: ${components.role}
      Task: ${components.task}
      Context: ${components.context}
      Format: ${components.format}
      Constraints: ${components.constraints}
      Persona (if any): ${components.customPersona || 'None'}

      --- ATTEMPT A ---
      PROMPT USED:
      ${promptA}
      RESULTING OUTPUT:
      ${outA}

      --- ATTEMPT B ---
      PROMPT USED:
      ${promptB}
      RESULTING OUTPUT:
      ${outB}

      Analyze the outputs based on strict adherence to the Task Requirements. Output a JSON object with 'winner' (must be EXACTLY 'A', 'B', or 'TIE') and 'reasoning' (1 concise sentence explaining exactly why based on the rules).`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  winner: { type: Type.STRING, description: "Exactly 'A', 'B', or 'TIE'" },
                  reasoning: { type: Type.STRING },
                },
                required: ['winner', 'reasoning'],
              },
            },
          }),
          this.timeoutMs,
          `Gemini request timed out after ${Math.round(this.timeoutMs / 1000)}s`
        )
      );

      const parsed = this.parseJSON<any>(response.text || '{}', {});
      return {
        winner: (parsed.winner?.toUpperCase() || 'TIE') as 'A' | 'B' | 'TIE',
        reasoning: parsed.reasoning || 'No reasoning provided.',
      };
    } catch (e: any) {
      console.error('Judge evaluation failed:', e);
      return { winner: 'TIE', reasoning: 'Judge error: ' + (e?.message || 'Unknown generation error') };
    }
  }
}
