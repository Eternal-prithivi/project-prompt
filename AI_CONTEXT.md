# AI_CONTEXT.md

This file gives AI agents a compact, reliable overview of the project.

## Project mission

Prompt Architect helps users convert weak prompts into production-grade prompts by:

- structuring prompts into key components
- generating high-quality variations
- running prompts against selected providers/models
- comparing outputs with a judge flow

## Architecture summary

- UI-centric app with orchestration in `src/components/Wizard.tsx`
- Provider abstraction via `ILLMProvider` contract (`src/services/types/ILLMProvider.ts`)
- Provider instances are created in `src/services/providerFactory.ts`
- Runtime delegation to the currently active provider through `src/services/geminiService.ts`
- Credentials stored encrypted in browser local storage through `src/services/credentialStore.ts`

## Core service map

- `src/services/geminiService.ts`
  - global provider lifecycle + method delegation
- `src/services/providerFactory.ts`
  - maps config to provider implementation
- `src/services/providers/*.ts`
  - concrete provider implementations
- `src/services/providers/validation.ts`
  - provider connectivity/key validation helpers
- `src/services/utils/timeout.ts`
  - request timeout helpers
- `src/services/utils/errors.ts`
  - `safeErrorMessage()` normalization

## Current provider model

Supported provider classes:

- `GeminiProvider`
- `DeepseekProvider`
- `OllamaProvider`
- `ChatGPTProvider`
- `ClaudeProvider`
- `GrokProvider`

All implement `ILLMProvider`.

Provider routing invariant:

- Settings choose exactly one active provider at a time.
- `src/services/geminiService.ts` is the only runtime delegation layer used by UI workflows.
- All prompt operations (`analyzePrompt`, `generateVariations`, `magicRefine`, `integrateAnswers`, `generateExamples`, `runPrompt`, `compressPrompt`, `judgeArenaOutputs`) must route to the currently initialized provider only.
- Shared service methods must not embed provider-specific default models. If no model is passed, the selected provider owns its own default.

## Key reliability behavior

- Standardized timeout handling is applied for provider calls
- Validation helpers use bounded timeout fetches
- Provider initialization errors are surfaced to UI
- Async UI flows include unmount guards for state safety
- Password-based credential encryption mode is available and lock-aware

## Test-driven development baseline

TDD is a core project practice. For feature, bug fix, and reliability work, agents should create or update tests before production code, then implement the smallest change that makes those tests pass.

Current test surfaces:

- `src/__tests__/providers/`: provider contract and provider-specific behavior
- `src/__tests__/components/`: React component behavior and modal/workflow surfaces
- `src/__tests__/services/`: service/storage behavior
- `src/__tests__/utils/`: utility behavior and edge cases
- `src/__tests__/integration/`: cross-service workflow coverage

Required gates:

- `npm run lint`
- `npm test`
- `npm run test:coverage` when auditing completeness, changing test infrastructure, or broadening a feature surface

Current coverage audit note: the suite passes, but coverage is not yet comprehensive across every file. The latest measured baseline is 44.1% statements and 46.36% lines, with the largest gaps in `Wizard.tsx`, `IncidentDisplay.tsx`, and `RecoveryActions.tsx`. Future phases should raise coverage while preserving provider abstraction boundaries.

## Folder structure (high value)

- `src/components/`: user flows + modals + UI composition
- `src/services/`: provider, storage, and system abstractions
- `src/services/providers/`: each LLM integration
- `src/services/utils/`: shared cross-cutting helpers
- `src/__tests__/`: provider/component/service/integration tests

## Environment and config

Reference source: `.env.example`

Variables used by app workflow and generated snippets:

- `VITE_GEMINI_API_KEY`
- `VITE_DEEPSEEK_API_KEY`
- `VITE_OLLAMA_URL`
- `VITE_OLLAMA_MODEL`
- `VITE_CHATGPT_API_KEY`
- `VITE_CLAUDE_API_KEY`
- `VITE_GROK_API_KEY`
- `VITE_APP_URL`

## Build performance notes

- `vite.config.ts` owns production chunk policy through an exported `manualChunks()` helper.
- Heavy provider SDKs are split into named chunks: `vendor-google-genai`, `vendor-openai`, and `vendor-anthropic`.
- Shared runtime libraries are also split from app code: `vendor-react`, `vendor-motion`, `vendor-icons`, and `vendor-crypto`.
- Lazy modal chunks are preserved for `ModelGallery`, `CompressionServiceModal`, and `OllamaSetupModal`.
- Keep chunk policy tests in `src/__tests__/config/viteConfig.test.ts` updated when changing Vite bundle strategy.
- Cloud provider SDKs must be dynamically imported inside provider implementations, not statically imported at module top level.
- Keep this policy covered in `src/__tests__/providers/providerSdkLoading.test.ts`.
- Current build behavior: initial `dist/index.html` modulepreloads shared runtime chunks, but not Gemini/OpenAI/Anthropic provider SDK chunks.

## Runtime performance notes

- `src/services/utils/promptResponseCache.ts` stores live prompt test responses in `sessionStorage`.
- Cache keys include provider, model, and resolved prompt text so provider/model switches do not reuse stale outputs.
- `VariationCard` uses the cache for repeated live tests and shows a "Cached response" badge when a result was reused.
- The result panel `REFRESH` action bypasses cache and calls the selected provider again.
- Keep cache behavior covered in `src/__tests__/utils/promptResponseCache.test.ts` and `src/__tests__/components/Wizard.test.tsx`.

## Commands AI agents should know

- Dev: `npm run dev`
- Typecheck: `npm run lint`
- Tests: `npm test`
- Coverage: `npm run test:coverage`
- Build: `npm run build`

## Coding conventions observed

- TypeScript-first
- Functional React components + hooks
- `async/await` for async flows
- single quotes, semicolons, and explicit imports
- centralized provider abstractions over direct SDK usage in UI

## Session handoff docs

After reading this file, agents must use:

- `AI_RULES.md` for behavior constraints
- `PROGRESS.md` for current task state
- `AUDIT_LOG.md` for historical actions and verification trail
