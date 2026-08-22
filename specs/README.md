# Behavior specifications

Gherkin feature files describe **what crochet-3d should do** from a crocheter's perspective. These are the review artifact — read and approve specs before implementation.

## Workflow

1. **Author** — use the `behavior-spec-author` agent or `behavior-specs` skill to write/update `.feature` files
2. **Review** — confirm scenarios match what you want
3. **Implement** — code changes in `src/` follow approved specs
4. **Verify** — `@e2e` scenarios → Playwright; `@engine` scenarios → Vitest

## Scope

**3D appearance** (yarn style, tube geometry, colors, lighting) is **not** acceptance-tested in behavioral specs. Only canvas presence, focus/skip-link, and pattern panel text/counts are normative.

## Files

| Feature | Covers |
|---------|--------|
| `app-shell.feature` | App load, toolbar, canvas, empty state |
| `foundation-chain.feature` | Creating a foundation chain |
| `single-crochet-rows.feature` | New row, adding SC, instructions |
| `pattern-validation.feature` | Input errors, placement guards |
| `reset-pattern.feature` | Clearing the pattern |
| `deferred.feature` | Roadmap items tagged `@deferred` (not yet implemented) |

## Scenario index

| Spec scenario | Test |
|---------------|------|
| App loads with toolbar, info panel, and 3D canvas | `e2e/app.spec.ts` — App loads… |
| Empty pattern shows guidance | `e2e/app.spec.ts` — Empty pattern… |
| Skip link focuses the 3D canvas region | `e2e/app.spec.ts` — Skip link… |
| Foundation chain shows next-step guidance | `e2e/app.spec.ts` — Create a foundation chain |
| Create a foundation chain | `e2e/app.spec.ts` — Create a foundation chain |
| Chain length dialog opens with a default of 10 | `e2e/app.spec.ts` — Chain length dialog… |
| Chain length can be typed directly | `e2e/app.spec.ts` — Chain length can be typed… |
| Chain length can be adjusted with stepper buttons | `e2e/app.spec.ts` — Chain length… stepper |
| Chain length can be adjusted with arrow keys | `e2e/app.spec.ts` — Chain length… arrow keys |
| Enter submits a valid chain length | `e2e/app.spec.ts` — Enter submits… |
| Stepper buttons disable at min and max bounds | `e2e/app.spec.ts` — Stepper buttons disable… |
| Empty chain length shows an error in the dialog | `e2e/app.spec.ts` — Empty chain length… |
| Out-of-range chain length shows an error in the dialog | `e2e/app.spec.ts` — Out-of-range chain length… |
| Cancel closes the chain dialog without creating a chain | `e2e/app.spec.ts` — Cancel closes… |
| Escape closes the chain dialog without creating a chain | `e2e/app.spec.ts` — Escape closes… |
| Declining New Chain reset keeps the existing pattern | `e2e/app.spec.ts` — Declining New Chain… |
| Confirming New Chain reset replaces the pattern | `e2e/app.spec.ts` — Confirming New Chain… |
| Chain length must be within allowed bounds | `tests/engine/Pattern.test.ts` |
| Cannot create a second foundation chain without reset | `tests/store/patternStore.test.ts` |
| Start the first working row after foundation | `e2e/app.spec.ts` — Start the first working row… |
| Add single crochet stitches across a row | `e2e/app.spec.ts` — Add single crochet stitches… |
| Work a second row after completing the first | `e2e/app.spec.ts` — Work a second row… |
| Cannot add single crochet on the foundation row | `tests/engine/Pattern.test.ts` — rejects single crochet on the foundation row |
| Row cannot exceed foundation length | `tests/engine/Pattern.test.ts` — rejects adding single crochet when the row is full |
| Add SC is disabled without a foundation chain | `e2e/app.spec.ts` — Add SC is disabled… |
| New Row is disabled without a foundation chain | `e2e/app.spec.ts` — New Row is disabled… |
| Add SC is disabled on the foundation row | `e2e/app.spec.ts` — Add SC is disabled on the foundation row |
| New Row is disabled while the current row is incomplete | `e2e/app.spec.ts` — New Row is disabled while… |
| Reset is disabled with no pattern | `e2e/app.spec.ts` — Reset is disabled… |
| Disabled toolbar buttons expose reasons to assistive technology | `e2e/app.spec.ts` — Disabled toolbar buttons… |
| Cannot start a new row with no stitches on the current row | `tests/engine/Pattern.test.ts` — rejects starting a new row when the current row has no stitches |
| Reset clears an existing pattern | `e2e/app.spec.ts` — Reset clears… |
| Declining reset keeps the existing pattern | `e2e/app.spec.ts` — Declining reset… |

## Deferred scenarios

| Spec scenario | Notes |
|---------------|-------|
| First-run onboarding explains how to start a pattern | `deferred.feature` — `@deferred` |
| Reset with no pattern is a no-op | `deferred.feature` — `@deferred` |
| Click an attachment point to place the next single crochet | `deferred.feature` — `@deferred` |
| Saved pattern round-trips through JSON export and import | `deferred.feature` — `@deferred @engine` |

## Tags

- `@e2e` — feature-level tag; proven by Playwright tests in `e2e/`
- `@engine` — proven by Vitest tests in `tests/engine/` and `tests/store/`
- `@deferred` — on the [product roadmap](../ROADMAP.md); no implementation until scheduled
- `@wip` — specified and in active development

## Roadmap

Priorities and phases: [`ROADMAP.md`](../ROADMAP.md)

## Cursor

- Agent: `.cursor/agents/behavior-spec-author.md`
- Skill: `.cursor/skills/behavior-specs/SKILL.md`
