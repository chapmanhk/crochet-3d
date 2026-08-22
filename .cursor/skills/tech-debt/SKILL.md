---
name: tech-debt
description: Find and fix technical debt in crochet-3d — duplication, dead code, layer leaks, spec/test drift, and deferred shortcuts. Use at end of sessions, before merge, or when the codebase feels heavier than the MVP warrants.
paths: src/**, tests/**, e2e/**, specs/**
---

# Technical Debt (crochet-3d)

Adapted from [ChernyCode techdebt](https://github.com/meleantonio/ChernyCode) for this repo's three-layer architecture and spec-first workflow.

Identify debt, fix what is safe in scope, and log the rest with severity for a future pass.

## When to use

- End of a development session or before merging a feature branch
- After multiple agents touched the same area (review + tests + UX)
- When duplicate logic appears across engine, store, and app
- When Playwright tests and Gherkin specs diverge

## What to look for

### Layer violations (high — fix first)
- `react`, `three`, `@react-three/*`, or `zustand` imported under `src/engine/`
- Placement or row rules in `src/scene/` or `src/app/`
- Crochet validation duplicated in UI instead of using engine `can*` / `PlacementError`

### Code duplication
- Same validation message in engine and UI copy (UI should use engine messages)
- Parallel `can*` checks and `throw` blocks with diverging text
- Copy-pasted dialog/focus-trap code (consolidate in `dialogUtils.ts`)
- Store tests that only repeat engine tests without bridge-specific assertions

### Dead code
- Unused exports (`getStitchLabel`, `relayout`, etc.)
- Unreachable branches after proactive disabled toolbar states
- Commented-out blocks and stale TODOs without issue links
- Files or agents referenced in docs but missing from repo

### Spec / test drift
- `@e2e` scenarios in `specs/*.feature` without a Playwright test
- Playwright tests with no matching Gherkin scenario
- `@engine` scenarios without Vitest coverage
- Error messages in specs that no longer match `PlacementError` text

### Outdated or shortcut patterns
- `window.confirm` / `window.prompt` for destructive flows (prefer `ConfirmDialog`)
- Missing `aria-live`, skip targets, or 44×44px targets on new UI
- Full stitch remounts instead of ID-based diff in scene
- Hardcoded bounds instead of `MIN_CHAIN_LENGTH` / `MAX_CHAIN_LENGTH`

### Code smells
- Functions > 50 lines or nesting > 3 levels
- Module-scoped mutable state without a documented reset path (see `patternStore` test helper)
- Magic numbers outside `layout.ts` / engine constants
- Growing `styles.css` without component grouping comments

### Deferred (log, do not implement unless asked)
- Click-to-place in 3D, Rapier drape, JSON persistence, instanced meshes
- Cucumber step definitions (Gherkin is review artifact; Playwright is executable proof)
- Three.js bundle splitting

## Workflow

1. **Scan** — `git diff main` for branch scope, or user-provided path. Grep for smells (see commands below).
2. **Report** — categorize findings: **high / medium / low** with file paths.
3. **Fix** — start with high-severity, low-risk items; one concern per commit when possible.
4. **Align specs** — if behavior changes, update `specs/*.feature` before code (see `behavior-spec-author`).
5. **Verify**
   ```bash
   npm run test:run
   npm run test:e2e
   npm run build
   ```
6. **Summarize** — fixed vs deferred backlog.

## Useful scans

```bash
# Layer violations
rg "from ['\"]react|from ['\"]three|from ['\"]zustand" src/engine

# Native browser shortcuts in app
rg "window\\.(confirm|prompt|alert)" src/app

# Spec tags vs tests (manual review)
rg "@e2e|@engine|@deferred" specs/

# Duplicated chain bounds
rg "500|MIN_CHAIN|MAX_CHAIN" src/

# Unused-looking exports (review manually)
rg "^export " src/engine src/app src/store src/scene
```

## Severity guide

| Severity | Examples | Action |
|----------|----------|--------|
| **High** | Engine imports React; placement in scene; spec/behavior mismatch | Fix in current pass |
| **Medium** | Duplicated dialog code; store tests mirroring engine only | Fix or open focused follow-up |
| **Low** | Stale comment; minor naming drift | Note in report; fix if trivial |

## Output format

### Debt found
Grouped by category with severity and paths.

### Fixed in this pass
What changed and why it was safe.

### Backlog
Remaining items for a future session (with suggested agent: `code-simplifier`, `test-writer`, etc.).

### Verification
Commands run and results.

## Related

- `.cursor/skills/three-layer-architecture/SKILL.md` — non-negotiable boundaries
- `.cursor/skills/behavior-specs/SKILL.md` — keeping specs and tests aligned
- `.cursor/agents/tech-debt.md` — agent entry point for a full audit
- `.cursor/agents/code-simplifier.md` — readability pass after debt removal
