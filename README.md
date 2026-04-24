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
- Testing: Vitest + Testing Library

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
- `npm run lint` - TypeScript typecheck (`tsc --noEmit`)
- `npm test` - run Vitest suite
- `npm run test:ui` - Vitest UI
- `npm run test:coverage` - test coverage run

## Reliability status (current)

- Timeout safety has been standardized across providers and validation calls
- Provider initialization failure handling is in place
- Error message normalization utility is present (`safeErrorMessage`)
- Credential storage supports password-based encrypted mode with unlock flow

## AI collaboration docs

If you are an AI agent or working with one, read these files in order:

1. `AI_MASTER.md`
2. `AI_CONTEXT.md`
3. `AI_RULES.md`
4. `PROGRESS.md`
5. `AUDIT_LOG.md`

