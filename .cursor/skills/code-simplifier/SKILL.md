---
name: code-simplifier
description: Simplify and clean up crochet-3d code after features land. Reduces complexity, improves readability, and keeps layers separated. Use after implementing a feature, fixing a bug, or before opening a PR.
paths: src/**, tests/**, e2e/**
---

# Code Simplifier (crochet-3d)

Adapted from [ChernyCode code-simplifier](https://github.com/meleantonio/ChernyCode) for this repo's TypeScript + React + Vitest stack.

Clean up code **after** behavior is correct and tests pass. Simplification must not change user-visible behavior or break layer boundaries.

## When to use

- End of a feature branch, before requesting review
- After a large diff where logic works but reads heavy
- When `code-reviewer` flags complexity but not correctness issues
- Pair with `verifier` — simplify only after tests are green

## Simplification goals

### Reduce complexity
- Break functions longer than ~40 lines into focused helpers
- Reduce nesting depth (max 3 levels); prefer early returns
- Simplify boolean conditionals; extract named predicates when reused
- Replace magic numbers with existing engine constants (`MIN_CHAIN_LENGTH`, `ROW_HEIGHT`, etc.)

### Improve readability (TypeScript / React)
- Use descriptive names aligned with crochet domain (`foundationChainLength`, not `len`)
- Prefer `interface` for object shapes; narrow union types over loose `string`
- Use path aliases (`@engine`, `@store`, `@scene`, `@app`) — no deep `../../../`
- Colocate small UI helpers in `src/app/` (e.g. `toolbarState.ts`, `dialogUtils.ts`)
- Remove unnecessary comments; keep comments for crochet semantics or non-obvious 3D behavior

### Clean up
- Remove unused imports, variables, and exports
- Remove commented-out code and dead branches
- Consolidate duplicate logic **within the same layer** (do not merge engine ↔ store ↔ scene)
- Deduplicate dialog/focus-trap patterns via shared app utilities

## Do not simplify into anti-patterns

Read `.cursor/skills/three-layer-architecture/SKILL.md` before moving code across layers.

| Avoid | Why |
|-------|-----|
| Moving placement rules into React or scene | Engine must stay source of truth |
| Inlining engine logic into Zustand store | Store only bridges snapshots |
| One React component per stitch | Scene uses imperative `StitchRenderer` diff sync |
| Premature abstraction (generic stitch factory, plugin system) | MVP scope — YAGNI |
| Changing public error messages without updating `specs/` | Gherkin is behavior source of truth |

## Workflow

1. **Scope** — default to files changed on the current branch (`git diff main --name-only`). Optionally accept a path argument.
2. **Analyze** — list simplification opportunities; prioritize high-readability, low-risk edits first.
3. **Simplify incrementally** — one logical change at a time; preserve behavior.
4. **Verify after each batch**
   ```bash
   npm run test:run
   npm run test:e2e   # if app/, e2e/, or specs/ changed
   npm run build
   ```
5. **Report** — what was simplified, what was intentionally left alone, and why.

## crochet-3d hotspots (common wins)

| Area | Look for |
|------|----------|
| `src/app/` | Repeated dialog markup, toolbar disabled-reason copy, inline handlers |
| `src/store/patternStore.ts` | Duplicated sync/error helpers; widen only via `syncState()` |
| `src/engine/Pattern.ts` | Parallel `can*` and `throw` paths — keep messages/codes consistent |
| `src/scene/StitchRenderer.ts` | Repeated geometry/material setup |
| `tests/` | Duplicated arrange blocks — extract local helpers, not shared test frameworks |
| `e2e/app.spec.ts` | Repeated Playwright helpers — keep at top of file |

## Output format

### Simplified
- Bullet list of changes with file paths

### Skipped (intentional)
- Complexity left in place with brief reason (e.g. "matches engine validation mirror")

### Verification
- Test/build commands run and results

## Related

- `.cursor/skills/code-style/SKILL.md` — formatting and naming
- `.cursor/agents/code-simplifier.md` — agent entry point for a full pass
- `.cursor/agents/tech-debt.md` — use when duplication is structural, not cosmetic
