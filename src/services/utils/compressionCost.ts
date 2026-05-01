/**
 * Compression Cost Estimator
 * Estimates API costs and token savings for compression
 */

// Approximate API costs per request (based on Gemini pricing)
const API_COSTS = {
  compress_request: 0.0001, // ~$0.0001 per compression API call
  validation_request: 0.0002, // ~$0.0002 per LLM judge call
};

// Token estimation
const TOKENS_PER_CHARACTER = 0.25; // Approximate: 1 token per 4 characters

/**
 * Estimate token count from text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length * TOKENS_PER_CHARACTER);
}

/**
 * Estimate API cost for compression
 */
export function estimateAPICost(mode: 'fast' | 'safe'): number {
  if (mode === 'fast') {
    // 1 API call: compress only
    return API_COSTS.compress_request;
  } else {
    // 2 API calls: compress + validate
    return Number((API_COSTS.compress_request + API_COSTS.validation_request).toFixed(4));
  }
}

/**
 * Calculate token savings from compression
 */
export function calculateTokenSavings(original: string, compressed: string): {
  originalTokens: number;
  compressedTokens: number;
  tokensSaved: number;
  percentReduction: number;
} {
  const originalTokens = estimateTokens(original);
  const compressedTokens = estimateTokens(compressed);
  const tokensSaved = originalTokens - compressedTokens;
  const percentReduction = originalTokens > 0
    ? Math.round((tokensSaved / originalTokens) * 100)
    : 0;

  return {
    originalTokens,
    compressedTokens,
    tokensSaved,
    percentReduction,
  };
}

/**
 * Estimate cost savings from using compressed prompt in future
 */
export function estimateFutureSavings(tokensSaved: number, apiCost?: number): {
  tokenCostReduction: number;
  breakEvenUses: number;
} {
  // Approximate cost per token (varies by model)
  const costPerToken = 0.00000015; // ~$0.00015 per 1000 tokens

  // Savings per use
  const tokenCostReduction = Math.max(0, tokensSaved) * costPerToken;
  const breakEvenUses =
    tokenCostReduction > 0 && apiCost
      ? Math.max(1, Math.ceil(apiCost / tokenCostReduction))
      : Number.POSITIVE_INFINITY;

  return {
    tokenCostReduction,
    breakEvenUses,
  };
}

/**
 * Calculate ROI for compression
 */
export function calculateCompressionROI(
  original: string,
  compressed: string,
  mode: 'fast' | 'safe'
): {
  apiCost: number;
  apiCostFormatted: string;
  futureTokenSavings: number;
  futureTokenSavingsFormatted: string;
  roi: number;
  worthIt: boolean;
  message: string;
} {
  const apiCost = estimateAPICost(mode);
  const savings = calculateTokenSavings(original, compressed);
  const futureEstimate = estimateFutureSavings(savings.tokensSaved, apiCost);

  // ROI calculation
  const roi = apiCost > 0 ? futureEstimate.tokenCostReduction / apiCost : 0;
  const worthIt = futureEstimate.breakEvenUses <= 1;

  const apiCostFormatted = apiCost < 0.001
    ? `$${(apiCost * 1000).toFixed(2)}m`
    : `$${apiCost.toFixed(4)}`;
  const futureTokenSavingsFormatted = futureEstimate.tokenCostReduction < 0.001
    ? `$${(futureEstimate.tokenCostReduction * 1000).toFixed(2)}m`
    : `$${futureEstimate.tokenCostReduction.toFixed(4)}`;

  let message = '';
  if (worthIt) {
    message = `Great! Saves ${savings.percentReduction}% tokens. Worth it after ${futureEstimate.breakEvenUses} use(s).`;
  } else if (Number.isFinite(futureEstimate.breakEvenUses)) {
    message = `Saves ${savings.percentReduction}% tokens. Break-even is about ${futureEstimate.breakEvenUses} use(s).`;
  } else {
    message = `No token savings detected yet, so compression is not cost-effective for reuse.`;
  }

  return {
    apiCost,
    apiCostFormatted,
    futureTokenSavings: futureEstimate.tokenCostReduction,
    futureTokenSavingsFormatted,
    roi,
    worthIt,
    message,
  };
}

/**
 * Get human-readable cost summary
 */
export function getCompressionCostSummary(
  original: string,
  compressed: string,
  mode: 'fast' | 'safe'
): string {
  const apiCost = estimateAPICost(mode);
  const savings = calculateTokenSavings(original, compressed);

  const apiCostStr = apiCost < 0.001
    ? `$${(apiCost * 1000).toFixed(2)}m`
    : `$${apiCost.toFixed(4)}`;

  return (
    `Compression Cost: ${apiCostStr} | ` +
    `Tokens Saved: ${savings.tokensSaved} (${savings.percentReduction}%) | ` +
    `Mode: ${mode}`
  );
}
