/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ScoreMetrics {
  clarity: number;
  context: number;
  constraints: number;
  tone: number;
  overall: number;
  feedback: string;
}

export interface PromptComponents {
  role: string;
  task: string;
  context: string;
  format: string;
  constraints: string;
  customPersona?: string;
  scores?: ScoreMetrics;
  questions?: string[];
}

export interface PromptVariation {
  id: string;
  type: 'precisionist' | 'creative' | 'mastermind' | 'custom' | string;
  title: string;
  description: string;
  content: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  input: string;
  variations: PromptVariation[];
}

export interface JudgeVerdict {
  winner: 'A' | 'B' | 'TIE';
  reasoning: string;
}

export type WizardStep = 'initial' | 'refining' | 'results';
