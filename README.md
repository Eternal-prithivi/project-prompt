# Prompt Architect

Prompt Architect is a React + TypeScript application for turning rough prompts into structured, high-quality prompt variants, testing them live across multiple LLM providers, and comparing outcomes in an A/B battle flow.

## What this project does

- Analyzes an initial user prompt into structured components (role, task, context, format, constraints)
- Refines and expands prompt components
- Generates multiple prompt variations (precisionist, creative, mastermind)
- Runs prompts live against selected providers/models
- Compares outputs in a battle arena and asks a judge model to pick a winner
- Supports cloud and local providers:
  - Google Gemini
  - DeepSeek
  - Local Ollama
  - ChatGPT/OpenAI
  - Claude/Anthropic
  - Grok/xAI

## Tech stack

- Frontend: React 19 + TypeScript + Vite
- Styling/UI: Tailwind CSS + custom UI components (`src/components/ui`)
- Motion/icons: `motion`, `lucide-react`
- LLM SDKs:
  - `@google/genai`
  - `openai`
  - `@anthropic-ai/sdk`
- Security/storage: `crypto-js` for credential encryption
- Testing: Vitest + Testing Library + Playwright + MSW

## Project structure

- `src/components/`
  - `Wizard.tsx`: primary product workflow and UI orchestration
  - `ModelGallery.tsx`: model discovery/selection
  - `OllamaSetupModal.tsx`: local setup helper
- `src/services/`
  - `geminiService.ts`: provider delegation layer
  - `providerFactory.ts`: provider instance creation
  - `credentialStore.ts`: encrypted local credential persistence
  - `systemInfo.ts`: local machine capability detection
  - `providers/`: individual provider implementations
  - `utils/`: shared utilities (`timeout.ts`, `errors.ts`)
  - `types/`: provider contracts (`ILLMProvider.ts`)
- `src/__tests__/`: unit/component/integration tests

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template and configure values:

```bash
cp .env.example .env
```

3. Start dev server:

```bash
npm run dev
```

App default URL: `http://localhost:3000`

## Environment variables

See `.env.example` for full list.

Primary variables:

- `VITE_GEMINI_API_KEY`
- `VITE_DEEPSEEK_API_KEY`
- `VITE_OLLAMA_URL`
- `VITE_OLLAMA_MODEL`
- `VITE_CHATGPT_API_KEY`
- `VITE_CLAUDE_API_KEY`
- `VITE_GROK_API_KEY`
- `VITE_APP_URL`

## Scripts

- `npm run dev` - start local development server
- `npm run build` - production build
- `npm run preview` - preview build output
- `npm run typecheck` - TypeScript typecheck (`tsc --noEmit`)
- `npm run lint` - typecheck + ESLint
- `npm test` - run Vitest suite once (CI-safe)
- `npm run test:ui` - Vitest UI
- `npm run test:coverage` - coverage run with thresholds (`70/60/65/70`)
- `npm run test:e2e` - Playwright browser flows

## Build optimization

Production builds use Vite/Rollup manual chunks for heavyweight provider SDKs and shared runtime libraries. This keeps the primary app chunk small while preserving lazy modal chunks for large UI surfaces.

Current named vendor chunks include:

- `vendor-google-genai`
- `vendor-openai`
- `vendor-anthropic`
- `vendor-react`
- `vendor-motion`
- `vendor-icons`
- `vendor-crypto`

## Runtime performance

Live prompt tests use a session-scoped response cache keyed by provider, model, and resolved prompt text. Re-running the same test can return instantly from cache, while the result panel exposes a `REFRESH` action to bypass cache and call the active provider again.

Battle arena runs also use a session-scoped cache keyed by provider, model, selected prompts, and current prompt components. Re-running the same fight can reuse cached outputs and verdict instantly, and the arena `REFRESH` action bypasses cache for fresh outputs.

Cloud provider SDKs are dynamically imported by their provider implementations. This keeps Gemini, OpenAI, and Anthropic SDK chunks out of the initial HTML modulepreload list; they load only when a selected provider actually needs them.

When users switch providers in Settings, the app issues a best-effort preload hint for the selected provider only, helping warm up the matching SDK chunk without eagerly preloading every provider.

## Testing and TDD workflow

Prompt Architect uses test-driven development for feature, bug fix, and reliability work.

Default workflow:

1. Add or update the relevant test first.
2. Run the targeted test and confirm the expected failure when practical.
3. Implement the smallest production change.
4. Run `npm run lint`, `npm test`, `npm run test:coverage`, and `npm run test:e2e` when coverage or browser-flow confidence is part of the work.

Test locations:

- `src/__tests__/components/` for React UI behavior
- `src/__tests__/providers/` for LLM provider contracts and provider-specific behavior
- `src/__tests__/services/` for storage/service behavior
- `src/__tests__/utils/` for shared utility edge cases
- `src/__tests__/integration/` for cross-flow workflow coverage

## Reliability status (current)

- Timeout safety has been standardized across providers and validation calls
- Provider initialization failure handling is in place
- Settings choose one active provider, and all runtime LLM requests route through that selected provider
- Error message normalization utility is present (`safeErrorMessage`)
- Credential storage supports password-based encrypted mode with unlock flow
- Automated coverage now has enforced minimums, and browser workflows are scaffolded in Playwright for end-to-end smoke coverage.

## Test layers

- Unit/component/integration tests run in Vitest with shared setup from `src/__tests__/setup.ts`.
- Network-facing UI tests can use MSW request handlers instead of ad hoc `fetch` stubs when a real request layer is helpful.
- Browser flows live in `e2e/` and run through Playwright against the Vite dev server.
- Manual provider verification steps are documented in [docs/manual-provider-smoke.md](docs/manual-provider-smoke.md).

## AI collaboration docs

If you are an AI agent or working with one, read these files in order:

1. `AI_MASTER.md`
2. `AI_CONTEXT.md`
3. `AI_RULES.md`
4. `PROGRESS.md`
5. `AUDIT_LOG.md`
