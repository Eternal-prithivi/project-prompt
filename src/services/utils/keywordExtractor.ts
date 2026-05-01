/**
 * Keyword Extractor Utility
 * Extracts critical constraints and keywords from prompts to validate
 * that compression preserves essential meaning.
 */

const FORMAT_KEYWORDS = [
  'json',
  'markdown',
  'yaml',
  'list',
  'table',
  'bullet',
  'numbered',
  'csv',
  'xml',
  'html',
] as const;

const REQUIRED_PATTERNS = [
  /must/gi,
  /required/gi,
  /mandatory/gi,
  /critical/gi,
  /important/gi,
  /never/gi,
  /always/gi,
  /ensure/gi,
  /guarantee/gi,
] as const;

const REQUIRED_KEYWORDS = [
  'must',
  'required',
  'mandatory',
  'critical',
  'important',
  'never',
  'always',
  'ensure',
  'guarantee',
] as const;

const TONE_KEYWORDS = [
  'professional',
  'casual',
  'formal',
  'friendly',
  'technical',
  'simple',
  'detailed',
  'concise',
  'verbose',
  'academic',
] as const;

function extractVariables(prompt: string): string[] {
  const variables: string[] = [];
  const variableRegex = /\[([A-Z_]+)\]/g;
  let match;
  while ((match = variableRegex.exec(prompt)) !== null) {
    variables.push(`[${match[1]}]`);
  }
  return [...new Set(variables)];
}

function includesConstraint(text: string, keyword: string): boolean {
  if (keyword.startsWith('[') && keyword.endsWith(']')) {
    return text.includes(keyword);
  }
  return text.toLowerCase().includes(keyword.toLowerCase());
}

/**
 * Extract critical keywords and constraints from prompt
 */
export function extractConstraints(prompt: string): string[] {
  const constraints: string[] = [];

  // Extract bracketed variables [UPPERCASE]
  constraints.push(...extractVariables(prompt));

  // Extract formatting keywords
  FORMAT_KEYWORDS.forEach((keyword) => {
    if (prompt.toLowerCase().includes(keyword)) {
      constraints.push(keyword);
    }
  });

  // Extract critical requirement patterns
  REQUIRED_PATTERNS.forEach((pattern) => {
    const matches = prompt.match(pattern);
    if (matches) {
      constraints.push(matches[0].toLowerCase());
    }
  });

  // Extract tone/style keywords
  TONE_KEYWORDS.forEach((keyword) => {
    if (prompt.toLowerCase().includes(keyword)) {
      constraints.push(keyword);
    }
  });

  // Remove duplicates
  return [...new Set(constraints)];
}

/**
 * Check if critical keywords are preserved in compressed version
 */
export function getPreservedKeywords(
  original: string,
  compressed: string
): { preserved: string[]; lost: string[] } {
  const constraints = extractConstraints(original);
  const preserved: string[] = [];
  const lost: string[] = [];

  constraints.forEach((keyword) => {
    if (includesConstraint(compressed, keyword)) {
      preserved.push(keyword);
    } else {
      lost.push(keyword);
    }
  });

  return { preserved, lost };
}

/**
 * Validate that compression preserves critical keywords
 * Returns quality score 0-100
 */
export function validateKeywordPreservation(
  original: string,
  compressed: string
): { passed: boolean; quality: number; analysis: string } {
  const constraints = extractConstraints(original);

  if (constraints.length === 0) {
    // No constraints to validate
    return {
      passed: true,
      quality: 100,
      analysis: 'No critical constraints found - compression quality unknown',
    };
  }

  const { preserved, lost } = getPreservedKeywords(original, compressed);

  // Calculate quality score
  const preservedRate = preserved.length / constraints.length;
  const quality = Math.round(preservedRate * 100);

  // Determine pass/fail
  // Lost critical keywords are bad
  const lostMustKeywords = lost.some((k) =>
    ['must', 'never', 'required', 'mandatory'].includes(k.toLowerCase())
  );

  const passed = !lostMustKeywords && quality >= 80;

  const analysis = `Preserved ${preserved.length}/${constraints.length} keywords${
    lost.length > 0 ? ` (Lost: ${lost.join(', ')})` : ''
  }`;

  return { passed, quality, analysis };
}

/**
 * Detailed constraint preservation analysis (for Safe mode)
 */
export function analyzeConstraintPreservation(
  original: string,
  compressed: string
): {
  variables: { lost: string[] };
  formatting: { lost: string[] };
  requirements: { lost: string[] };
  tone: { lost: string[] };
  totalScore: number;
} {
  // Extract all constraint types
  const originalLower = original.toLowerCase();
  const compressedLower = compressed.toLowerCase();
  const variables = extractVariables(original);
  const formatKeywords = FORMAT_KEYWORDS.filter((keyword) => originalLower.includes(keyword));
  const requiredKeywords = REQUIRED_KEYWORDS.filter((keyword) => originalLower.includes(keyword));
  const toneKeywords = TONE_KEYWORDS.filter((keyword) => originalLower.includes(keyword));

  // Find lost items
  const lostVariables = variables.filter((v) => !compressed.includes(v));
  const lostFormatting = formatKeywords.filter((keyword) => !compressedLower.includes(keyword));
  const lostRequirements = requiredKeywords.filter((keyword) => !compressedLower.includes(keyword));
  const lostTone = toneKeywords.filter((keyword) => !compressedLower.includes(keyword));

  // Calculate total score
  const totalItems =
    variables.length + formatKeywords.length + requiredKeywords.length + toneKeywords.length;
  const totalLost = lostVariables.length + lostFormatting.length + lostRequirements.length + lostTone.length;
  const totalScore = totalItems === 0 ? 100 : Math.round(((totalItems - totalLost) / totalItems) * 100);

  return {
    variables: { lost: lostVariables },
    formatting: { lost: lostFormatting },
    requirements: { lost: lostRequirements },
    tone: { lost: lostTone },
    totalScore,
  };
}
