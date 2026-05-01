import { describe, expect, it } from 'vitest';
import {
  calculateCompressionROI,
  calculateTokenSavings,
  estimateAPICost,
  estimateFutureSavings,
  estimateTokens,
  getCompressionCostSummary,
} from '../../services/utils/compressionCost';

describe('compressionCost', () => {
  it('estimates tokens at one token per four characters', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('a'.repeat(1000))).toBe(250);
  });

  it('uses the documented fast and safe API costs', () => {
    expect(estimateAPICost('fast')).toBe(0.0001);
    expect(estimateAPICost('safe')).toBe(0.0003);
  });

  it('calculates token savings and percentage reduction from the real text lengths', () => {
    const savings = calculateTokenSavings('a'.repeat(400), 'b'.repeat(100));

    expect(savings).toEqual({
      originalTokens: 100,
      compressedTokens: 25,
      tokensSaved: 75,
      percentReduction: 75,
    });
  });

  it('bases future savings on tokens saved rather than original token count', () => {
    const estimate = estimateFutureSavings(100, 0.0003);

    expect(estimate.tokenCostReduction).toBeCloseTo(0.000015);
    expect(estimate.breakEvenUses).toBe(20);
  });

  it('marks strong compression as worth it immediately when one reuse pays back the API cost', () => {
    const original = 'a'.repeat(4000);
    const compressed = 'b'.repeat(1000);
    const roi = calculateCompressionROI(original, compressed, 'fast');

    expect(roi.apiCostFormatted).toBe('$0.10m');
    expect(roi.futureTokenSavings).toBeCloseTo(0.0001125);
    expect(roi.worthIt).toBe(true);
    expect(roi.message).toContain('Worth it after 1 use(s)');
  });

  it('reports no-savings cases as not cost effective', () => {
    const roi = calculateCompressionROI('same text', 'same text', 'safe');

    expect(roi.futureTokenSavings).toBe(0);
    expect(roi.roi).toBe(0);
    expect(roi.worthIt).toBe(false);
    expect(roi.message).toContain('No token savings detected yet');
  });

  it('returns a human-readable summary string', () => {
    const summary = getCompressionCostSummary('a'.repeat(400), 'b'.repeat(100), 'safe');

    expect(summary).toContain('Compression Cost: $0.30m');
    expect(summary).toContain('Tokens Saved: 75 (75%)');
    expect(summary).toContain('Mode: safe');
  });
});
