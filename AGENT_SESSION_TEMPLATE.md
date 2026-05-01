# AGENT_SESSION_TEMPLATE.md

Copy/paste this template into `AUDIT_LOG.md` for every agent session.

```md
## YYYY-MM-DD — <short session title>

- **SESSION_ID**: <required; short unique id like `2026-04-24T1530Z-audit1`>
- **AGENT_NAME**: <optional; e.g. `cursor-agent` or your name>
- **Goal**: <what you intended to accomplish>
- **Context**: <1–2 lines, why this work now>
- **Scope (files)**:
  - `<path1>`
  - `<path2>`
- **Actions**:
  - <action 1>
  - <action 2>
- **TDD evidence**:
  - <tests added/updated before implementation, or documented exception>
  - <targeted failing test observed when practical>
- **Verification**:
  - `npm run lint` -> <pass/fail + notes>
  - `npm test` -> <pass/fail + notes>
  - `npm run test:coverage` -> <pass/fail/skipped + notes>
- **Outcome**: <done / partial / blocked>
- **Handoff**:
  - **Next step**: <exact next action>
  - **Risks**: <anything fragile>
  - **Notes**: <anything a new agent must know>
```

Checklist for the agent before ending session:

- [ ] `SCRATCHPAD.md` updated (or cleared if done)
- [ ] `PROGRESS.md` updated
- [ ] `AUDIT_LOG.md` entry appended
- [ ] TDD evidence or exception documented
