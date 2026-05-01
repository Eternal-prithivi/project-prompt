import { describe, expect, it } from 'vitest';
import {
  compressWithRules,
  estimateRuleBasedQuality,
  isRuleBasedCompressionViable,
  safeRuleBasedCompress,
} from '../../services/utils/ruleBasedCompression';

describe('ruleBasedCompression', () => {
  it('removes filler language while preserving bracketed variables', () => {
    const compressed = compressWithRules(
      'Please kindly make sure to write this in JSON for [TARGET_AUDIENCE] and be very detailed.'
    );

    expect(compressed).toContain('[TARGET_AUDIENCE]');
    expect(compressed).toContain('JSON');
    expect(compressed.toLowerCase()).not.toContain('please');
    expect(compressed.toLowerCase()).not.toContain('kindly');
    expect(compressed.toLowerCase()).not.toContain('very');
  });

  it('estimates better quality for larger reductions', () => {
    expect(estimateRuleBasedQuality('a'.repeat(100), 'a'.repeat(95))).toBe(50);
    expect(estimateRuleBasedQuality('a'.repeat(100), 'a'.repeat(40))).toBe(75);
  });

  it('treats the 10% reduction threshold as worthwhile', () => {
    expect(isRuleBasedCompressionViable('abcdefghij', 'abcdefghi')).toEqual({
      viable: true,
      quality: 50,
      reason: 'Compressed 10% (estimate: 50% quality)',
    });
  });

  it('returns a successful fallback result for a clearly verbose prompt', () => {
    const result = safeRuleBasedCompress(
      'Please make sure to provide a very detailed answer in markdown for [TOPIC] and also explain every important step.'
    );

    expect(result.success).toBe(true);
    expect(result.compressed).toContain('[TOPIC]');
    expect(result.quality).toBeGreaterThan(0);
  });
});
