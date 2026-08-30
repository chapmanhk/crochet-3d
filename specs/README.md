# Behavior specifications

Gherkin feature files describe **what crochet-3d should do** from a crocheter's perspective. These are the review artifact — read and approve specs before implementation.

## Workflow

1. **Author** — use the `behavior-spec-author` agent or `behavior-specs` skill to write/update `.feature` files
2. **Review** — confirm scenarios match what you want
3. **Implement** — code changes in `src/` follow approved specs
4. **Verify** — `@e2e` scenarios → Playwright; `@engine` scenarios → Vitest

### E2E conventions

Playwright proof uses shared setup in `e2e/test.ts` (onboarding suppressed via init script) and `e2e/helpers.ts` (`gotoApp` clears autosave and waits for toolbar; `waitForAppReady` waits out lazy 3D load; `clickToolbarButton` retries flaky toolbar clicks). These mechanics are not spelled out in Gherkin steps.

## Scope

**Behavioral specs** (`*.feature`) cover crocheter-observable UI: toolbar, panels, dialogs, status text, counts, and guidance. They do **not** assert yarn fill, outline stroke, or canvas fill — those are scene-layer concerns (see table below). Drape graph joint topology in `drape-preview.feature` is reviewed in Gherkin (`@engine`) but proven in `tests/scene/buildDrapeGraph.test.ts`, not Playwright.

**Scene visual contract** (implemented in `src/scene/`, verified in `tests/scene/`):

| Constant / behavior | Value / rule | Source |
|---------------------|--------------|--------|
| Canvas background | `#f7f0e6` warm flat fill (no perspective grid) | `SCENE_BACKGROUND` in `src/app/sceneConstants.ts`, mirrored in `CrochetScene.tsx` for chunk split, `--scene-background` in `styles.css` |
| Yarn fill color | `0xd98952` | `STITCH_YARN_COLOR` in `stitchMaterials.ts` |
| Outline style | Screen-space stroke (~2.5 px), darker yarn tone; merged mesh pair per segment or instanced batches | `geometryMerge.ts`, `instancedStitches.ts`, legacy `createOutlinedStitch()` in `stitchMaterials.ts` |
| Visual row height | `0.22` scene units per working row (engine `ROW_HEIGHT` = 1.2 is **not** used for stitch height) | `VISUAL_ROW_HEIGHT` in `stitchRealism.ts` |
| SC topology | Inverted-V arc + two legs per stitch; top working-yarn bridge between neighbors | `buildWorkingStitchGeometry()` in `stitchGeometry.ts` |
| Foundation topology | Chain loops + spine segments per chain stitch | `buildFoundationRowGeometry()` |
| Segment sync | Row-level yarn segments + join segments; fingerprint diff | `StitchRenderer.sync()` |
| Drape simulation cap | 200 dynamic stitch nodes max; whole rows only | `MAX_DRAPE_SIMULATION_NODES` in `buildDrapeGraph.ts` |
| Drape spring tuning | Post / loop / secondary stiffness + damping | `DRAPE_SPRING_TUNING` in `buildDrapeGraph.ts` |

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
| `templates.feature` | Coaster, swatch, and large swatch templates |
| `persistence.feature` | Save/load JSON, export/copy instructions |
| `scale-preview.feature` | Instanced rendering, attachment a11y, large-pattern performance |
| `drape-preview.feature` | Yarn constraint springs (`@engine`) + toggle behavior (`@e2e`) |
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
| Save pattern downloads a JSON file | `e2e/persistence.spec.ts` — Save pattern downloads… |
| Load pattern replaces the current work after confirmation | `e2e/persistence.spec.ts` — Load pattern replaces… |
| Load pattern is cancelled without replacing work | `e2e/persistence.spec.ts` — Load pattern is cancelled… |
| Invalid pattern file shows an error | `e2e/persistence.spec.ts` — Invalid pattern file… |
| Copy instructions places pattern text on the clipboard | `e2e/persistence.spec.ts` — Copy instructions… |
| Export instructions downloads a markdown file | `e2e/persistence.spec.ts` — Export instructions… |
| Pattern restores from autosave after refresh | `e2e/persistence.spec.ts` — Pattern restores from autosave… |
| Saved pattern round-trips through JSON export and import | `tests/engine/persistence.test.ts` — round-trips a saved pattern… |
| Unsupported pattern file version is rejected | `tests/engine/persistence.test.ts` — rejects unsupported file versions |
| Pattern file with duplicate stitch ids is rejected | `tests/engine/persistence.test.ts` — rejects duplicate stitch ids |
| Large pattern renders without blocking the toolbar | `e2e/scale-preview.spec.ts` — Large pattern renders… |
| Attachment target is announced in the info panel | `e2e/scale-preview.spec.ts` — Attachment target is announced… |
| Magic ring attachment target uses round wording | `e2e/scale-preview.spec.ts` — Magic ring attachment target uses round wording |
| Instanced row rendering batches stitches by prototype | `tests/scene/instancedRendering.test.ts` — reuses stitch prototypes… |
| Merged segment geometry reduces mesh count | `tests/scene/instancedRendering.test.ts` — merges foundation row…; mesh pair in `StitchRenderer.test.ts` |
| Yarn color picker updates the selected color | `e2e/app.spec.ts` — Yarn color picker… |
| Create a magic ring foundation | `e2e/app.spec.ts` — Create a magic ring foundation |
| Work multiple rounds on a magic ring | `e2e/app.spec.ts` — Work multiple rounds on a magic ring |
| Magic ring stitch count must be within allowed bounds | `tests/engine/Pattern.test.ts` — magic ring bounds |
| Load a coaster template | `e2e/app.spec.ts` — Load a coaster template |
| Load a swatch template | `e2e/app.spec.ts` — Load a swatch template |
| Place half double crochet stitches | `e2e/app.spec.ts` — Place half double crochet stitches |
| Place double crochet stitches | `e2e/app.spec.ts` — Place double crochet stitches |
| Half double crochet attaches like single crochet | `tests/engine/Pattern.test.ts` — HDC placement |
| Increase places two stitches in one parent slot | `e2e/app.spec.ts` — Increase places two stitches… |
| Decrease consumes two parent slots | `e2e/app.spec.ts` — Decrease consumes two parent slots |
| Decrease uses two parent stitches | `tests/engine/stitchTypes.test.ts` — places a decrease across two parent stitches |
| Undo is disabled with nothing to undo | `e2e/app.spec.ts` — Undo is disabled… |
| Reset clears undo and redo history | `e2e/app.spec.ts` — Reset clears undo and redo history |
| No attachment point when SC cannot be placed | `e2e/app.spec.ts` — No attachment point… |
| Drape graph connects stitches to parent loop anchors | `tests/scene/buildDrapeGraph.test.ts` — connects working stitches… |
| Drape graph connects same-row neighbors with post springs | `tests/scene/buildDrapeGraph.test.ts` — links same-row neighbors… |
| Drape graph caps simulation size for very large patterns | `tests/scene/buildDrapeGraph.test.ts` — caps simulation nodes… |
| Drape preview with yarn constraints remains toggleable | `e2e/drape-preview.spec.ts` — Drape preview with yarn constraints… |
| Drape preview is disabled without a pattern | `e2e/drape-preview.spec.ts` — Drape preview is disabled without a pattern |
| Drape graph respects magic ring foundation anchors | `tests/scene/buildDrapeGraph.test.ts` — positions magic ring loop anchors… |
| First stitch of each working row includes turning-chain lift | `tests/scene/stitchRealism.test.ts` — lifts the first stitch… |
| Reset with no pattern is disabled | `e2e/app.spec.ts` — Reset is disabled…; `reset-pattern.feature` |

## Deferred scenarios

| Spec scenario | Notes |
|---------------|-------|
| _(none — see Phase 6 in `ROADMAP.md`)_ | `deferred.feature` reserved for future capabilities |

## Tags

- `@e2e` — feature-level tag; proven by Playwright tests in `e2e/`
- `@engine` — proven by Vitest tests in `tests/engine/`, `tests/store/`, and `tests/scene/`
- `@deferred` — on the [product roadmap](../ROADMAP.md); no implementation until scheduled
- `@wip` — specified and in active development

## Roadmap

Priorities and phases: [`ROADMAP.md`](../ROADMAP.md)

## Cursor

- Agent: `.cursor/agents/behavior-spec-author.md`
- Skill: `.cursor/skills/behavior-specs/SKILL.md`
