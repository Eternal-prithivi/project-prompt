# AI_MASTER.md

This is the master onboarding and execution file for all AI agents working on this repository.

---

## Mandatory startup flow

Read these files in order at the start of EVERY session. Do not skip any.

1. `AI_SYSTEM_PROMPT.md` — operating principles, priority hierarchy, execution quality framework
2. `README.md` — project overview and developer setup
3. `AI_CONTEXT.md` — architecture, stack, service map, coding conventions
4. `AI_RULES.md` — required operating rules and what NOT to do
5. `DECISIONS.md` — settled architecture and design decisions (do not re-debate these)
6. `PROGRESS.md` — current task state with file-level and function-level checkboxes
7. `SCRATCHPAD.md` — active mid-task state (read this before touching any code)
8. `AUDIT_LOG.md` — historical action log and verification trail
9. `AGENT_SESSION_TEMPLATE.md` — use this when appending to `AUDIT_LOG.md`

If any of these files are missing, create them using the templates at the bottom of this file before proceeding.

---

## Task execution protocol

1. Read `SCRATCHPAD.md` first — if there is an active task, continue it before starting anything new
2. Confirm the objective from user request + `PROGRESS.md`
3. Scope change to minimum safe set of files (list them before editing)
4. Define the test plan before implementation:
   - identify unit, component, provider, utility, and integration tests affected
   - create or update the relevant test files first for behavior changes
   - run the targeted test and confirm it fails for the expected reason when practical
5. Implement in small, verifiable steps — update `SCRATCHPAD.md` after each step
6. Run quality checks (`npm run lint`, `npm test`, and `npm run test:coverage` when coverage risk changed)
7. Summarize outcome clearly with verification results

---

## Test-driven development standard

TDD is the default workflow for all feature, bug fix, and reliability work in this repository.

- Tests come before production code for behavioral changes.
- New user-facing behavior needs component or integration coverage.
- New provider/service behavior needs unit tests around success, failure, timeout, malformed input, and edge cases.
- Bug fixes need a regression test that fails before the fix when practical.
- Refactors must preserve existing tests and add tests only when behavior or risk changes.
- Documentation-only changes may skip new tests, but must still run the appropriate verification gates.
- If a change cannot reasonably be tested, document why in `AUDIT_LOG.md` and add a tracked follow-up in `PROGRESS.md`.

---

## Mandatory after-task updates

After completing each task/session, update ALL of the following:

### 1. SCRATCHPAD.md
- If task is COMPLETE: clear the active task section, write "No active task."
- If task is INCOMPLETE (session ending mid-task): write exact resume state (see SCRATCHPAD.md format)

### 2. PROGRESS.md
- Check off completed sub-tasks at file/function level
- Set the current in-progress item with exact next step
- Update blockers/risks

### 3. AUDIT_LOG.md
- Append a new entry (append-only, never edit history)
- Include: timestamp, goal, files touched, verification commands + results, handoff note
- Use the copy/paste structure in `AGENT_SESSION_TEMPLATE.md` for consistency
- `SESSION_ID` is required for every session entry (unique per session)

### 4. If architecture or behavior changed
- Update `README.md` (developer-facing)
- Update `AI_CONTEXT.md` (agent-facing)
- Update `DECISIONS.md` if a new design decision was made

---

## Definition of done

A task is ONLY done when ALL of the following are true:

- [ ] Implementation is complete
- [ ] Tests were written or updated before implementation for behavior changes
- [ ] `npm run lint` passed (or failures documented)
- [ ] `npm test` passed (or failures documented with reason)
- [ ] `npm run test:coverage` passed when coverage changed or test completeness is being audited
- [ ] `PROGRESS.md` updated with checked-off items
- [ ] `AUDIT_LOG.md` has a new entry
- [ ] `SCRATCHPAD.md` is cleared (no dangling active task)
- [ ] Next handoff is explicit

---

## Fast reference

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server at localhost:3000 |
| `npm run lint` | TypeScript typecheck (tsc --noEmit) |
| `npm test` | Run Vitest suite |
| `npm run build` | Production build |
| `npm run test:coverage` | Coverage report |

---

## File creation templates

Use these when a required file is missing.

### SCRATCHPAD.md (missing)
```md
# SCRATCHPAD.md
Last updated: YYYY-MM-DD

## Active task
No active task.

## Session context
_Fill in when starting a task._
```

### DECISIONS.md (missing)
```md
# DECISIONS.md
_No decisions recorded yet. Add entries as decisions are made._
```
