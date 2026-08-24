# Behavior specifications

Gherkin feature files describe **what crochet-3d should do** from a crocheter's perspective. These are the review artifact — read and approve specs before implementation.

## Workflow

1. **Author** — use the `behavior-spec-author` agent or `behavior-specs` skill to write/update `.feature` files
2. **Review** — confirm scenarios match what you want
3. **Implement** — code changes in `src/` follow approved specs
4. **Verify** — `@e2e` scenarios → Playwright; `@engine` scenarios → Vitest

## Scope

**Behavioral specs** (`*.feature`) cover crocheter-observable UI: toolbar, panels, dialogs, status text, counts, and guidance. They do **not** assert yarn topology, colors, outline stroke, or canvas fill — those are scene-layer concerns.

**Scene visual contract** (implemented in `src/scene/`, verified in `tests/scene/`):

| Constant / behavior | Value / rule | Source |
|---------------------|--------------|--------|
| Canvas background | `#f7f0e6` warm flat fill (no perspective grid) | `SCENE_BACKGROUND` in `CrochetScene.tsx`, `--scene-background` in `styles.css` |
| Yarn fill color | `0xd98952` | `STITCH_YARN_COLOR` in `stitchMaterials.ts` |
| Outline style | Screen-space stroke (~2.5 px), darker yarn tone, one outline per yarn strand | `createOutlinedStitch()` in `stitchMaterials.ts` |
| Visual row height | `0.22` scene units per working row (engine `ROW_HEIGHT` = 1.2 is **not** used for stitch height) | `VISUAL_ROW_HEIGHT` in `stitchRealism.ts` |
| SC topology | Inverted-V arc + two legs per stitch; top working-yarn bridge between neighbors | `buildWorkingStitchGeometry()` in `stitchGeometry.ts` |
| Foundation topology | Chain loops + spine segments per chain stitch | `buildFoundationRowGeometry()` |
| Segment sync | Row-level yarn segments + join segments; fingerprint diff | `StitchRenderer.sync()` |

Do not add Gherkin steps for these — keep proof in `tests/scene/*.test.ts`.

## Files

| Feature | Covers |
|---------|--------|
| `app-shell.feature` | App load, toolbar, canvas, empty state |
| `foundation-chain.feature` | Creating a foundation chain |
| `single-crochet-rows.feature` | New row, adding SC, instructions |
| `pattern-validation.feature` | Input errors, placement guards |
| `reset-pattern.feature` | Clearing the pattern |
| `click-to-place.feature` | Click attachment points in 3D canvas to place SC |
| `pattern-editing.feature` | Undo and redo stitch placements |
| `stitch-types.feature` | HDC/DC, increase/decrease |
| `templates.feature` | Coaster and swatch templates |
| `deferred.feature` | Roadmap items tagged `@deferred` (not yet implemented) |

## Scenario index

| Spec scenario | Test |
|---------------|------|
| App loads with toolbar, info panel, and 3D canvas | `e2e/app.spec.ts` — App loads… |
| Empty pattern shows guidance | `e2e/app.spec.ts` — Empty pattern… |
| Skip link focuses the 3D canvas region | `e2e/app.spec.ts` — Skip link… |
| Foundation chain shows next-step guidance | `e2e/app.spec.ts` — Foundation chain shows next-step guidance |
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
| Scene visual contract (see Scope) | `tests/scene/stitchGeometry.test.ts`, `stitchMaterials.test.ts`, `StitchRenderer.test.ts`, `sceneConstants.test.ts` |
| Next attachment point is available when SC can be placed | `e2e/app.spec.ts` — Click-to-place… |
| Clicking the attachment point places the next SC | `e2e/app.spec.ts` — Clicking the attachment point… |
| Click-to-place matches Add SC toolbar behavior | `e2e/app.spec.ts` — Click-to-place matches… |
| Reject placement on an invalid attachment target | `tests/engine/Pattern.test.ts` — rejects placement on a non-next attachment target |
| Undo removes the last placed single crochet | `e2e/app.spec.ts` — Undo removes… |
| Redo restores an undone placement | `e2e/app.spec.ts` — Redo restores… |
| Undo after startNewRow reverts row increment | `tests/engine/Pattern.test.ts` — undoes a started row… |
| First-run onboarding explains how to start a pattern | `e2e/app.spec.ts` — Onboarding… |
| Info panel can be collapsed on narrow viewports | `e2e/app.spec.ts` — Responsive panels… |
| Row 2 attaches to far end of row 1 after turning | `tests/engine/Pattern.test.ts` — attaches row 2… |

## Deferred scenarios

| Spec scenario | Notes |
|---------------|-------|
| Reset with no pattern is a no-op | `deferred.feature` — `@deferred` |
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
