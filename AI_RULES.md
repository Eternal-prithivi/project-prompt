# AI_RULES.md

These rules are mandatory for every AI agent session in this repository.

## 1) Read order before coding

Always read, in order:

1. `AI_MASTER.md`
2. `AI_SYSTEM_PROMPT.md`
3. `README.md`
4. `AI_CONTEXT.md`
5. `DECISIONS.md`
6. `PROGRESS.md`
7. `SCRATCHPAD.md`
8. `AUDIT_LOG.md`

## 2) Execution rules

- Do not make broad refactors unless explicitly requested
- Keep changes scoped to the active task
- Preserve existing architecture patterns (`providerFactory`, `geminiService`, `ILLMProvider`)
- Reuse existing utilities before adding new ones (`timeout.ts`, `errors.ts`)
- Prefer minimal-risk edits over large rewrites

## 3) Quality gates

Before closing any coding session:

- Run `npm run lint`
- Run `npm test` (or targeted tests if user asks)
- If you changed code, ensure `PROGRESS.md` + `AUDIT_LOG.md` are updated and `SCRATCHPAD.md` is cleared.
- If checks fail, either fix or clearly document unresolved failures in `AUDIT_LOG.md` and `PROGRESS.md`

CI enforcement:

- PRs will fail if code changes do not include updates to `PROGRESS.md` and `AUDIT_LOG.md`, or if `SCRATCHPAD.md` is not cleared.

## 4) What NOT to do

- Do not use destructive git operations
- Do not silently change test expectations without documenting why
- Do not bypass provider abstractions by hardcoding SDK calls into UI components
- Do not store plaintext credentials
- Do not leave stale TODO markers without tracking them in `PROGRESS.md`

## 5) Required logging after each task

After finishing each meaningful task:

1. Append a new entry to `AUDIT_LOG.md` with:
   - date/time
   - required `SESSION_ID` (unique per session)
   - task goal
   - files touched
   - checks run and result
   - outcome/handoff
   - use `AGENT_SESSION_TEMPLATE.md`
2. Update `PROGRESS.md`:
   - move completed items to Done
   - set current in-progress item
   - refresh next actions and blockers
 3. If session ends mid-task, update `SCRATCHPAD.md` with exact resume instructions.

## 6) Coding style alignment

Observed style in this codebase:

- TypeScript with explicit interfaces/types where useful
- React hooks and function components
- Single quotes + semicolons
- Small utility helpers for cross-cutting logic
- Human-readable errors exposed through safe message paths

## 7) Documentation policy

- Update `README.md` if behavior visible to developers/users changes
- Update `AI_CONTEXT.md` if architecture or workflow changes
- Keep `PROGRESS.md` concise and current
- Keep `AUDIT_LOG.md` append-only

