/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TelemetryData {
  totalPromptsRun: number;
  totalTokensCompressed: number;
  estimatedCostSaved: number;
  providerUsage: Record<string, number>;
  battleWins: Record<string, number>;
}

const TELEMETRY_STORAGE_KEY = 'prompt-architect-telemetry-v1';

const getInitialData = (): TelemetryData => ({
  totalPromptsRun: 0,
  totalTokensCompressed: 0,
  estimatedCostSaved: 0,
  providerUsage: {},
  battleWins: {},
});

export function getTelemetryData(): TelemetryData {
  if (typeof window === 'undefined') return getInitialData();
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (!raw) return getInitialData();
    return { ...getInitialData(), ...JSON.parse(raw) };
  } catch {
    return getInitialData();
  }
}

function saveTelemetryData(data: TelemetryData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors (e.g. quota exceeded or private mode)
  }
}

export function recordPromptRun(provider: string): void {
  const data = getTelemetryData();
  data.totalPromptsRun += 1;
  data.providerUsage[provider] = (data.providerUsage[provider] || 0) + 1;
  saveTelemetryData(data);
}

export function recordCompression(tokensSaved: number, costSaved: number): void {
  const data = getTelemetryData();
  data.totalTokensCompressed += tokensSaved;
  data.estimatedCostSaved += costSaved;
  saveTelemetryData(data);
}

export function recordBattleWin(winnerModel: string): void {
  const data = getTelemetryData();
  data.battleWins[winnerModel] = (data.battleWins[winnerModel] || 0) + 1;
  saveTelemetryData(data);
}

export function clearTelemetryData(): void {
  saveTelemetryData(getInitialData());
}
