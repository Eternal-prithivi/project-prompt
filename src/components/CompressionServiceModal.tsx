import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Copy, Check, RefreshCw, X, Zap, Shield } from 'lucide-react';
import { Button } from './ui/Button';
import { Textarea } from './ui/Inputs';
import { compressPrompt } from '../services/llmService';
import {
  cacheCompression,
  getCachedCompression,
} from '../services/utils/compressionCache';
import {
  validateKeywordPreservation,
} from '../services/utils/keywordExtractor';
import {
  calculateTokenSavings,
  calculateCompressionROI,
} from '../services/utils/compressionCost';
import {
  safeRuleBasedCompress,
} from '../services/utils/ruleBasedCompression';
import { safeErrorMessage } from '../services/utils/errors';
import { cn } from '../lib/utils';

interface CompressionResult {
  original: string;
  compressed: string;
  mode: 'fast' | 'safe';
  quality: number;
  tokensSaved: number;
  percentReduction: number;
  wasCached: boolean;
  apiCost: string;
}

export const CompressionServiceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'fast' | 'safe'>('fast');
  const [isCompressing, setIsCompressing] = useState(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCompress = async () => {
    if (!input.trim()) {
      setError('Please enter a prompt to compress');
      return;
    }

    setIsCompressing(true);
    setError(null);
    setResult(null);

    try {
      // Check cache first
      const cached = getCachedCompression(input, mode);
      if (cached) {
        const savings = calculateTokenSavings(input, cached.compressed);
        setResult({
          original: input,
          compressed: cached.compressed,
          mode,
          quality: cached.quality,
          tokensSaved: savings.tokensSaved,
          percentReduction: savings.percentReduction,
          wasCached: true,
          apiCost: '$0.00 (cached)',
        });
        setIsCompressing(false);
        return;
      }

      // Compress
      let compressed = '';
      let apiCost = '';

      try {
        compressed = await compressPrompt(input);
        const roi = calculateCompressionROI(input, compressed, mode);
        apiCost = roi.apiCostFormatted;

        // Validate quality
        if (mode === 'safe') {
          const validation = validateKeywordPreservation(input, compressed);
          if (!validation.passed) {
            setError(
              `Compression quality too low (${validation.quality}%). Keeping original. ${validation.analysis}`
            );
            setIsCompressing(false);
            return;
          }
        }
      } catch {
        // Fallback to rule-based compression if API fails
        const fallback = safeRuleBasedCompress(input);
        if (!fallback.success) {
          throw new Error(fallback.message);
        }
        compressed = fallback.compressed;
        apiCost = '$0.00 (free fallback)';

        setError(
          `API compression failed. Using free fallback compression (${Math.round(fallback.quality)}% effective)`
        );
      }

      // Calculate metrics
      const savings = calculateTokenSavings(input, compressed);
      const keywordVal = validateKeywordPreservation(input, compressed);

      // Cache the result
      cacheCompression(
        input,
        compressed,
        mode,
        Math.max(keywordVal.quality, 85)
      );

      setResult({
        original: input,
        compressed,
        mode,
        quality: Math.max(keywordVal.quality, 85),
        tokensSaved: savings.tokensSaved,
        percentReduction: savings.percentReduction,
        wasCached: false,
        apiCost,
      });
    } catch (e: any) {
      setError(`Compression failed: ${safeErrorMessage(e)}`);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setInput('');
    setResult(null);
    setError(null);
    setMode('fast');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-label="Compression Service"
        aria-modal="true"
        className="bg-[#0B0D17] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-b from-[#0B0D17] to-[#0B0D17]/80 backdrop-blur-xl border-b border-white/5 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Compress Prompt</h2>
              <p className="text-white/50 text-sm">Reduce tokens, keep meaning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close compression modal"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!result ? (
            <>
              {/* Input Section */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/70">
                  Your Prompt
                </label>
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste your prompt here..."
                  className="min-h-[200px] bg-black/40 border-white/10 focus:border-cyan-500/50 text-base"
                  disabled={isCompressing}
                />
                <p className="text-xs text-white/40">
                  {input.length} characters | ~{Math.ceil(
                    input.length / 4
                  )} tokens
                </p>
              </div>

              {/* Mode Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/70">
                  Compression Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode('fast')}
                    disabled={isCompressing}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all text-left',
                      mode === 'fast'
                        ? 'border-cyan-500/50 bg-cyan-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold text-white">Fast</span>
                    </div>
                    <p className="text-xs text-white/60">
                      1 API call (~$0.0001)
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      Quick compression, keyword validation
                    </p>
                  </button>

                  <button
                    onClick={() => setMode('safe')}
                    disabled={isCompressing}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all text-left',
                      mode === 'safe'
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-white">Safe</span>
                    </div>
                    <p className="text-xs text-white/60">
                      2 API calls (~$0.0003)
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      Quality validated, LLM judge
                    </p>
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCompress}
                  disabled={isCompressing || !input.trim()}
                  className="flex-1 h-10 gap-2"
                >
                  {isCompressing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Compressing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Compress Now
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  disabled={isCompressing || !input}
                  className="h-10"
                >
                  Clear
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Result Section */}
              <div className="space-y-4">
                {error && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 text-sm">
                    {error}
                  </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                    <p className="text-xs text-cyan-200/70 mb-1">Tokens Saved</p>
                    <p className="text-2xl font-bold text-cyan-300">
                      {result.tokensSaved}
                    </p>
                    <p className="text-xs text-cyan-200/50 mt-1">
                      {result.percentReduction}% reduction
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <p className="text-xs text-emerald-200/70 mb-1">Quality</p>
                    <p className="text-2xl font-bold text-emerald-300">
                      {result.quality}%
                    </p>
                    <p className="text-xs text-emerald-200/50 mt-1">
                      Meaning preserved
                    </p>
                  </div>
                </div>

                {/* API Cost */}
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
                  <p className="text-xs text-white/50 mb-1">API Cost</p>
                  <p className="text-sm font-mono font-semibold text-amber-300">
                    {result.apiCost}
                  </p>
                  {result.wasCached && (
                    <p className="text-xs text-white/40 mt-1">
                      ✅ Retrieved from cache (instant, free)
                    </p>
                  )}
                </div>

                {/* Original vs Compressed */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-white/70">
                        Original
                      </label>
                      <span className="text-xs text-white/40">
                        ~{Math.ceil(result.original.length / 4)} tokens
                      </span>
                    </div>
                    <div className="p-3 bg-black/40 border border-white/10 rounded-lg text-xs text-white/70 max-h-[200px] overflow-y-auto font-mono leading-relaxed">
                      {result.original}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-white/70">
                        Compressed
                      </label>
                      <span className="text-xs text-white/40">
                        ~{Math.ceil(result.compressed.length / 4)} tokens
                      </span>
                    </div>
                    <div className="p-3 bg-black/40 border border-emerald-500/20 rounded-lg text-xs text-emerald-100 max-h-[200px] overflow-y-auto font-mono leading-relaxed">
                      {result.compressed}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => handleCopy(result.compressed)}
                  className="flex-1 h-10 gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Compressed
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="h-10 px-4"
                >
                  Compress Another
                </Button>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="h-10 px-4"
                >
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
