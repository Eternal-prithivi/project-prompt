import { describe, expect, it } from 'vitest';
import {
  analyzeConstraintPreservation,
  extractConstraints,
  getPreservedKeywords,
  validateKeywordPreservation,
} from '../../services/utils/keywordExtractor';

describe('keywordExtractor', () => {
  it('extracts variables, formatting, requirements, and tone constraints from a prompt', () => {
    const constraints = extractConstraints(
      'Return JSON for [USER_NAME] in a professional tone and MUST include sources.'
    );

    expect(constraints).toEqual(
      expect.arrayContaining(['[USER_NAME]', 'json', 'professional', 'must'])
    );
  });

  it('matches non-variable constraints case-insensitively during preservation checks', () => {
    const preserved = getPreservedKeywords(
      'Return JSON for [USER_NAME] in a professional tone.',
      'return json for [USER_NAME] with a PROFESSIONAL rewrite.'
    );

    expect(preserved.lost).toEqual([]);
    expect(preserved.preserved).toEqual(
      expect.arrayContaining(['[USER_NAME]', 'json', 'professional'])
    );
  });

  it('fails validation when a critical requirement is removed', () => {
    const validation = validateKeywordPreservation(
      'You MUST include [CHECKLIST] and NEVER skip citations.',
      'Include [CHECKLIST].'
    );

    expect(validation.passed).toBe(false);
    expect(validation.quality).toBeLessThan(100);
    expect(validation.analysis).toContain('never');
  });

  it('passes validation when all detected constraints survive compression', () => {
    const validation = validateKeywordPreservation(
      'Use [TOPIC] and output markdown in a friendly tone.',
      'Friendly markdown response for [TOPIC].'
    );

    expect(validation).toEqual({
      passed: true,
      quality: 100,
      analysis: 'Preserved 3/3 keywords',
    });
  });

  it('scores only the constraints actually present in the original prompt', () => {
    const analysis = analyzeConstraintPreservation(
      'Return JSON.',
      'Return json.'
    );

    expect(analysis).toEqual({
      variables: { lost: [] },
      formatting: { lost: [] },
      requirements: { lost: [] },
      tone: { lost: [] },
      totalScore: 100,
    });
  });

  it('reports lost variables and formatting without penalizing unrelated categories', () => {
    const analysis = analyzeConstraintPreservation(
      'Use [TOPIC] and return JSON.',
      'Return plain text.'
    );

    expect(analysis.variables.lost).toEqual(['[TOPIC]']);
    expect(analysis.formatting.lost).toEqual(['json']);
    expect(analysis.requirements.lost).toEqual([]);
    expect(analysis.tone.lost).toEqual([]);
    expect(analysis.totalScore).toBe(0);
  });
});
