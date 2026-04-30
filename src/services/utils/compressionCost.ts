/**
 * Compression Cost Estimator
 * Estimates API costs and token savings for compression
 */

// Approximate API costs per request (based on Gemini pricing)
const API_COSTS = {
  compress_request: 0.00005, // ~$0.00005 per compression API call
  validation_request: 0.00005, // ~$0.00005 per LLM judge call
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
    return API_COSTS.compress_request + API_COSTS.validation_request;
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
export function estimateFutureSavings(originalTokens: number): {
  tokenCostReduction: number;
  breakEvenUses: number;
} {
  // Approximate cost per token (varies by model)
  const costPerToken = 0.00000015; // ~$0.00015 per 1000 tokens

  // Savings per use
  const tokenCostReduction = originalTokens * costPerToken;

  return {
    tokenCostReduction,
    breakEvenUses: 1, // Usually break even after 1-2 uses
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
  const futureEstimate = estimateFutureSavings(savings.originalTokens);

  // ROI calculation
  const roi = futureEstimate.tokenCostReduction / apiCost;
  const worthIt = roi > 1; // Worth it if savings > cost

  const apiCostFormatted = apiCost < 0.001
    ? `$${(apiCost * 1000).toFixed(2)}m`
    : `$${apiCost.toFixed(4)}`;
  const futureTokenSavingsFormatted = futureEstimate.tokenCostReduction < 0.001
    ? `$${(futureEstimate.tokenCostReduction * 1000).toFixed(2)}m`
    : `$${futureEstimate.tokenCostReduction.toFixed(4)}`;

  let message = '';
  if (worthIt) {
    message = `Great! Saves ${savings.percentReduction}% tokens. Worth it after ${futureEstimate.breakEvenUses} use(s).`;
  } else {
    message = `Saves ${savings.percentReduction}% tokens, but break-even depends on usage frequency.`;
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
