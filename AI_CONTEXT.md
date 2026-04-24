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

## Key reliability behavior

- Standardized timeout handling is applied for provider calls
- Validation helpers use bounded timeout fetches
- Provider initialization errors are surfaced to UI
- Async UI flows include unmount guards for state safety
- Password-based credential encryption mode is available and lock-aware

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

## Commands AI agents should know

- Dev: `npm run dev`
- Typecheck: `npm run lint`
- Tests: `npm test`
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

