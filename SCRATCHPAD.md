# SCRATCHPAD.md

Last updated: 2026-04-24

## Active task

No active task.

## Resume instructions (only fill when mid-task)

- **Where to continue**: <file path + function/component>
- **Exact next step**: <one concrete action>
- **Known blockers**: <if any>
- **Notes**: <anything subtle>

# SCRATCHPAD.md

**Purpose:** Mid-task state for AI agents. This file is the "sticky note on the desk."
It captures exact in-progress state so any new session can resume without rediscovery.

- Write here AFTER each meaningful step within a task.
- CLEAR this file (reset to "No active task") when a task reaches Definition of Done.
- This file is NOT append-only — rewrite it freely during a task.

---

## Active task

No active task.

---

## How to use this file (template for active tasks)

When a task is in progress, replace the section above with:

```
## Active task

**Task:** Phase 2.1 — Rate-limit retry/backoff utility
**Started:** YYYY-MM-DD
**Status:** In progress — session ended mid-task

### Decisions made this session
- Using exponential backoff with jitter (not fixed delay) — avoids thundering herd
  when multiple provider calls fire simultaneously. See DECISIONS.md for full rationale.
- Max 3 retries, base delay 1000ms, max delay 10000ms, jitter ±20%
- Retry only on HTTP 429 and network timeouts — not on 4xx auth/validation errors

### Completed steps ✅
- [x] Added `retryWithBackoff()` to `src/services/utils/timeout.ts`
- [x] Added unit tests in `src/__tests__/services/retry.test.ts`
- [x] `npm run lint` passed after timeout.ts changes

### NOT yet done ❌
- [ ] Wire `retryWithBackoff()` into `geminiProvider.ts` → wrap `generateContent()` calls
- [ ] Wire into `claudeProvider.ts` → wrap `messages.create()` calls
- [ ] Wire into `deepseekProvider.ts` → wrap `makeRequest()` internal method
- [ ] Wire into `chatgptProvider.ts` and `grokProvider.ts`
- [ ] OllamaProvider intentionally excluded (local, no rate limits)
- [ ] Run full `npm test` after all providers wired

### Next literal step
Open `src/services/providers/geminiProvider.ts`.
Wrap the `this.aiClient.models.generateContent(...)` call inside `retryWithBackoff()`.
Pattern:
  const result = await retryWithBackoff(() => this.aiClient.models.generateContent(...), retryOpts);

### Files currently modified (may have unsaved/partial state)
- `src/services/utils/timeout.ts` — retryWithBackoff() added at bottom of file
- `src/__tests__/services/retry.test.ts` — new file, tests written but not run yet

### Do NOT touch this session
- `src/services/credentialStore.ts` — unrelated
- `src/components/Wizard.tsx` — unrelated
- Any test files other than retry.test.ts
```