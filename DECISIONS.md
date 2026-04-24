# DECISIONS.md

Record durable project decisions here (do not re-debate every session).

Format (ADR-lite):

```md
## YYYY-MM-DD — <decision title>

- **Context**: <why this decision was needed>
- **Decision**: <what we decided>
- **Consequences**: <trade-offs / follow-ups>
```

## 2026-04-24 — AI continuity via repo docs

- **Context**: New agents lose continuity due to context-window limits.
- **Decision**: Maintain continuity via repo-owned docs: `AI_MASTER.md`, `AI_SYSTEM_PROMPT.md`, `AI_CONTEXT.md`, `AI_RULES.md`, `PROGRESS.md`, `SCRATCHPAD.md`, `AUDIT_LOG.md`.
- **Consequences**: Agents must update `PROGRESS.md` and `AUDIT_LOG.md` after each task, and keep `SCRATCHPAD.md` accurate when mid-task.

# DECISIONS.md

Settled architecture and design decisions for Prompt Architect.

**Rules for this file:**
- Add an entry every time a non-obvious decision is made and committed.
- Never delete entries — if a decision is reversed, add a new entry that supersedes it.
- The goal: a new agent reads this and does NOT re-debate or re-invent settled choices.

---

## DEC-001 — Provider abstraction via ILLMProvider interface

**Date:** 2026-04-23
**Decision:** All LLM integrations must implement `ILLMProvider`. UI components and
`geminiService.ts` must never call provider SDKs directly.
**Why:** Enables runtime provider swapping, consistent error handling, and isolated testing.
**Alternatives rejected:** Direct SDK calls in Wizard.tsx (rejected — couples UI to provider).
**Impact:** All 6 providers (Gemini, DeepSeek, Ollama, ChatGPT, Claude, Grok) implement this interface.

---

## DEC-002 — Delegation layer kept in geminiService.ts (historical naming)

**Date:** 2026-04-23
**Decision:** The delegation/routing layer file is named `geminiService.ts` even though
it now routes to all providers, not just Gemini.
**Why:** Renaming would break existing imports across the codebase for no functional gain.
**Note:** The name is misleading but intentional. Do not rename without explicit user instruction.

---

## DEC-003 — Credential encryption: AES with password + device binding (v2)

**Date:** 2026-04-23
**Decision:** Credentials are stored in localStorage encrypted with AES.
The encryption key is derived from: `SHA256(password + deviceFingerprint + salt)`.
**Why:** Password-only encryption is portable (attacker could copy localStorage and brute-force).
Device binding ties the ciphertext to the specific browser profile.
**Legacy:** v1 used device fingerprint only (no password). v1 payloads are still readable
via the legacy path in `getCredentials()`. Do not remove the legacy path until migration is done.
**Storage key:** `pa_creds_v1` in localStorage.

---

## DEC-004 — Timeout handling: timeoutPromise wrapping SDK calls, fetchWithTimeout for raw fetch

**Date:** 2026-04-23
**Decision:** 
- For SDK-based providers (Gemini, Claude, ChatGPT, Grok): use `timeoutPromise()` wrapping the SDK call.
- For fetch-based providers (DeepSeek, Ollama): use `fetchWithTimeout()` with AbortController.
**Why:** SDK clients don't expose AbortSignal on all methods, so we race with a rejection timer.
Fetch-based providers use AbortController for clean signal propagation.
**Default timeout:** 30000ms (30s) unless overridden via `ProviderConfig.timeoutMs`.

---

## DEC-005 — Ollama uses /api/chat endpoint, not /api/generate

**Date:** 2026-04-23
**Decision:** OllamaProvider calls `/api/chat` (messages format) instead of `/api/generate`.
**Why:** `/api/generate` returns 404 for newer Ollama models like `llama3.1:8b`.
`/api/chat` is supported universally across all current Ollama models.
**Response field:** `data.message.content` (not `data.response`).

---

## DEC-006 — Bare Ollama model names are resolved to tagged names before API calls

**Date:** 2026-04-23
**Decision:** `OllamaProvider.resolveModel()` fetches `/api/tags` and maps
`deepseek-r1` → `deepseek-r1:7b` (whichever tag is installed).
**Why:** Ollama returns 404 if the model name doesn't match the installed tag exactly.
Users typically configure bare names like `deepseek-r1`.
**Timeout for resolution:** 5000ms (separate from main request timeout).
**Fallback:** If `/api/tags` is unreachable, the bare name is used as-is.

---

## DEC-007 — GrokProvider uses OpenAI SDK pointed at xAI base URL

**Date:** 2026-04-23
**Decision:** GrokProvider instantiates `OpenAI` client with `baseURL: 'https://api.x.ai/v1'`.
**Why:** xAI's API is OpenAI-compatible. Reusing the OpenAI SDK avoids a separate HTTP client.
**Model:** `grok-2-1212` as default.

---

## DEC-008 — No plaintext credential storage, ever

**Date:** 2026-04-23
**Decision:** API keys must never be written to localStorage unencrypted.
The only exception is environment variables via `.env` (Vite inlines at build time, acceptable for dev).
**Enforcement:** `credentialStore.ts` is the sole write path for credentials.
UI must never call `localStorage.setItem` with keys directly.

---

## DEC-009 — Error normalization via safeErrorMessage()

**Date:** 2026-04-23
**Decision:** All error-to-string conversions in UI paths must use `safeErrorMessage()` from
`src/services/utils/errors.ts`, not `e.message` directly.
**Why:** Provider SDKs return various error shapes. Direct `.message` access throws or returns
undefined on non-Error objects.
**Do not:** Add new error string extraction logic inline in components.

---

## DEC-010 — Phase 2 resilience work order

**Date:** 2026-04-24
**Decision:** Phase 2 work is prioritized in this order:
1. Phase 2.1: rate-limit retry/backoff utility
2. Phase 2.2: Ollama re-validation before critical local actions
3. Phase 2.3: model availability checks + cache strategy
4. Phase 2.4: localStorage quota error UX + recovery
**Why:** Retry/backoff has the broadest impact across all cloud providers.
Ollama validation is isolated to local path. Model cache is lower urgency (nice-to-have).
localStorage quota is edge case UX.
**Reorder only if:** User explicitly reprioritizes.