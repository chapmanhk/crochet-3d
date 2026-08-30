# Product roadmap

crochet-3d is a **3D crochet pattern designer** with a spec-first workflow: behavior is defined in [`specs/`](specs/), implemented across engine → store → scene → app, and verified with Vitest + Playwright.

This document is the **single source of truth for product direction**. When planning work, update this file and add or tag scenarios in `specs/*.feature` before coding.

---

## Vision

Help beginners and hobbyists **design crochet patterns visually** while learning correct structure — foundation chains, rows, stitch placement, and readable instructions — without needing to visualize the fabric in their head.

The 3D canvas is primary; panels explain status and next steps in plain crochet language.

---

## Shipped — v0.1 MVP

| Capability | Specs | Notes |
|------------|-------|-------|
| App shell (toolbar, info panel, 3D canvas) | `app-shell.feature` | Skip link, empty-state guidance |
| Foundation chain (stepper dialog) | `foundation-chain.feature` | Default 10, keyboard + validation |
| Single crochet rows | `single-crochet-rows.feature` | Row progress, instructions |
| Pattern validation (disabled toolbar) | `pattern-validation.feature` | Proactive guards + tooltips |
| Reset / New Chain confirms | `reset-pattern.feature`, `foundation-chain.feature` | Accessible `ConfirmDialog` |
| Pure engine + diff-based 3D render | `@engine` tags | No physics yet |
| Illustrated SC V-stitch topology + row stacking | `specs/README.md` Scope | Scene-only `VISUAL_ROW_HEIGHT`; inverted-V arcs with leg-through layering |
| Flat canvas background (no grid floor) | `specs/README.md` Scope | `#f7f0e6` via `SCENE_BACKGROUND` + CSS variable |
| Screen-space outline stroke | `specs/README.md` Scope | Replaces scaled BackSide hull shadow |

**Stack:** TypeScript engine · Zustand store · R3F scene · React app · Gherkin specs · Vitest · Playwright

---

## Phase 1 — Interaction & polish

Make the designer feel like a **creative tool**, not just a button-driven demo.

| Priority | Feature | Why | Spec target |
|----------|---------|-----|-------------|
| P0 | **Click-to-place SC** on 3D attachment points | Core creative-loop: see where stitches attach | `click-to-place.feature` |
| P1 | **Undo / redo** last placement | Lowers cost of mistakes for beginners | `pattern-editing.feature` |
| P1 | **Row working direction** (turn logic) | Required for realistic patterns beyond flat rows | `single-crochet-rows.feature` |
| P2 | **Start Pattern onboarding** modal | First-run guidance for new users | `app-shell.feature` |
| P2 | **Responsive panels** (tablet/mobile) | Collapsible info panel, toolbar wrap | `app-shell.feature` |

**Exit criteria:** A crocheter can build a small flat piece by clicking attachment points in the canvas, undo a mistake, and understand row status without reading error banners.

---

## Shipped — v0.2 Phase 1

| Capability | Specs | Notes |
|------------|-------|-------|
| Click-to-place SC on 3D attachment points | `click-to-place.feature` | DOM bridge `data-testid="attachment-point"` |
| Undo / redo stitch placements | `pattern-editing.feature` | Snapshot history in store |
| Row turn direction (alternating LTR/RTL) | `single-crochet-rows.feature` | `workingDirection.ts`, visual column layout |
| First-run onboarding modal | `app-shell.feature` | `localStorage` gate |
| Collapsible info panel (tablet) | `app-shell.feature` | Hide/Show panel toggle ≤960px |

---

## Phase 2 — Pattern richness

Expand what patterns can express while keeping the engine testable.

| Priority | Feature | Why | Spec target |
|----------|---------|-----|-------------|
| P0 | **Double crochet, half double crochet** | Most common stitches after SC | New `stitch-types.feature` |
| P1 | **Increase / decrease** | Shaping (amigurumi, garments) | `stitch-types.feature` |
| P1 | **Magic ring / foundation alternatives** | Common starting techniques | `foundation-chain.feature` |
| P2 | **Pattern templates** (coaster, small swatch) | Faster starts for beginners | New `templates.feature` |
| P2 | **Yarn color picker** | Visual delight, WIP clarity | `app-shell.feature` |

**Exit criteria:** At least three stitch types with engine tests; instructions remain human-readable and spec-aligned.

---

## Shipped — v0.3 Phase 2 (current)

| Capability | Specs | Notes |
|------------|-------|-------|
| Half double crochet and double crochet | `stitch-types.feature` | Stitch type selector, dynamic Add button |
| Increase / decrease shaping | `stitch-types.feature` | Slot-based row completion; Inc/Dec toolbar |
| Magic ring foundation | `foundation-chain.feature` | Chain / magic ring tabs in Start foundation dialog |
| Pattern templates (coaster, swatch) | `templates.feature` | Pre-built multi-row examples |
| Yarn color picker | `app-shell.feature` | Info panel color input; scene yarn tint |

---

## Shipped — v0.4 Phase 3 (current)

| Capability | Specs | Notes |
|------------|-------|-------|
| Save / load pattern JSON | `persistence.feature` | Versioned file format with pattern snapshot + yarn color + stitch type |
| Export / copy instructions | `persistence.feature` | Markdown download + clipboard plain text |
| Import validation | `persistence.feature` | Schema version, stitch graph integrity, user-facing errors |
| Session autosave | `persistence.feature` | `localStorage` restore on refresh |

---

## Shipped — v0.5 Phase 4 (current)

| Capability | Specs | Notes |
|------------|-------|-------|
| Instanced stitch meshes | `scale-preview.feature` | `InstancedMesh` batches for flat working rows ≥4 stitches; merged geometry for foundation/joins |
| Three.js code splitting | `scale-preview.feature` | Lazy scene load; separate `scene`, `three`, `r3f`, `rapier` chunks |
| Rapier drape preview | `drape-preview.feature`, `scale-preview.feature` | Optional toolbar toggle; spring-linked Rapier proxy layer |
| Stitch-level attachment description | `scale-preview.feature` | `aria-live` info panel sync for next attachment target |

**Exit criteria met:** Large swatch template (120 stitches) renders with interactive toolbar; orbit controls remain responsive.

---

## Phase 5 — Realism & in-the-round polish

Phases 1–4 delivered a full creative loop (place stitches, undo, save/load, scale preview). Phase 5 makes the **3D preview trustworthy for shaped and in-the-round work** — where beginners most need visual feedback — and finishes the drape preview started in Phase 4.

**Theme:** Fabric fidelity over feature breadth. No new stitch types or sharing until round work and illustrated geometry read as real crochet.

| Priority | Feature | Why | Spec target |
|----------|---------|-----|-------------|
| P0 | **Drape preview v2** — scene-aligned loop anchors, `foundationType`, physics remount | Phase 4 springs use simplified positions; magic ring / HDC / decreases hang incorrectly; simulation state can drift after edits | Extend `drape-preview.feature` (`@engine` + `@e2e`) |
| P0 | **In-the-round visual fidelity** — radial layout, round join paths, attachment copy | Magic ring and rounds exist in the engine but scene/readout gaps make amigurumi hard to verify | Extend `foundation-chain.feature`, `scale-preview.feature` |
| P1 | **Increase/decrease local shaping** — fan/bunch at stitch tops | Shaping is count-correct but geometry is flat; amigurumi doming/cupping doesn't read in 3D | Extend `stitch-types.feature` + `tests/scene/` |
| P1 | **Drape toggle UX** — disabled reason, lazy-load status, stable label | Matches other toolbar buttons; avoids state-as-label confusion | `pattern-validation.feature`, `drape-preview.feature` |
| P2 | **Turning-chain height offset** at row starts | Flat rows misalign at edges without modeled chain lift | `single-crochet-rows.feature` |
| P2 | **Spec & doc continuity** — onboarding/responsive Gherkin, README scene contract sync | `specs/README.md` indexes scenarios not yet in `.feature` files | `app-shell.feature`, `specs/README.md` |
| P2 | **Reset no-op when empty** | Low-risk polish; promoted from `deferred.feature` | `reset-pattern.feature` |

**Exit criteria:** A crocheter can build a 4-round magic-ring piece, see radial stitch layout and round-aware attachment guidance, toggle drape preview with correct loop anchors for chain and magic-ring foundations, and recognize increase/decrease shaping as local fabric deformation — not just stitch-count changes.

**Explicitly deferred to Phase 6+:** treble crochet and taller stitches, pattern sharing URLs, garment grading, full continuous-yarn physics, native mobile apps.

---

## Shipped — v0.6 Phase 5

| Capability | Specs | Notes |
|------------|-------|-------|
| Drape preview v2 | `drape-preview.feature` | Scene-aligned loop anchors via `getDrapeLoopAnchorPosition`; `foundationType` threaded store → scene; `Physics` remount on pattern change; no ball colliders |
| In-the-round attachment copy | `scale-preview.feature` | Magic ring targets described as "the magic ring" with round context |
| Inc/dec shaping emphasis | `stitch-types.feature` | Stronger fan/bunch in `getStitchShapeAdjustments` |
| Drape toggle UX | `drape-preview.feature` | Stable "Drape preview" label, `aria-pressed`, disabled reason via `ToolbarActionButton` |
| Turning-chain lift | `single-crochet-rows.feature` | First stitch of each working row (`column === 0`, `row >= 1`) |
| Spec continuity | `app-shell.feature`, `reset-pattern.feature` | Onboarding/responsive Gherkin; reset disabled when empty |

---

## Phase 6 — TBD (next)

Future work to be defined after Phase 5 review.

---

## Engineering backlog (not user-facing)

| Item | Status | Notes |
|------|--------|-------|
| Unify engine `can*` and `throw` validation paths | **Done** | `validate*` private methods in `Pattern.ts` |
| Shared geometry disposal on HMR remount | **Done** | Per-segment dispose on row change; full dispose on unmount/HMR |
| Row-level yarn path rendering | **Done** | Per-row segments: foundation loops, SC V-stitch topology, join paths |
| Illustrated scene style (flat bg, outline stroke, visual row height) | **Done** | `stitchGeometry.ts`, `stitchMaterials.ts`, `CrochetScene.tsx` |
| Per-row geometry fingerprinting | **Done** | `StitchRenderer` skips rebuild when row fingerprint unchanged |
| Engine validation messages for toolbar disabled states | **Done** | `getAddSingleCrochetError()` / `getStartNewRowError()` |
| E2E hardening (shared fixtures, autosave isolation, toolbar retry) | **Done** | `e2e/test.ts`, `e2e/helpers.ts` |
| Drape spring graph (loop/post/secondary, 200-node row cap) | **Done** | `buildDrapeGraph.ts`, `drape-preview.feature` |
| Drape preview v2 (scene-aligned anchors, `foundationType`, physics remount) | **Done** | `buildDrapeGraph.ts`, `stitchGeometry.ts`, `DrapePreviewLayer.tsx` |
| Inc/dec geometric fan/bunch in scene layer | **Done** | `stitchRealism.ts` shape adjustments |
| Cucumber step definitions | Deferred | Playwright is executable proof |
| Store tests that only mirror engine | **Done** | Store tests focus on bridge behavior (`lastError`, sync, flags) |

---

## How work flows through the repo

```
ROADMAP.md (priorities)
    ↓
specs/*.feature (behavior — tag @deferred until scheduled)
    ↓ review & approve
src/engine → src/store → src/scene → src/app
    ↓
tests/engine + e2e (proof)
    ↓
tech-debt → code-simplifier → verifier
```

### Spec tags

| Tag | Meaning |
|-----|---------|
| `@e2e` | Needs Playwright test in `e2e/` |
| `@engine` | Engine-only; Vitest in `tests/engine/` |
| `@deferred` | On the roadmap but not scheduled for current phase |
| `@wip` | Specified and in active development |

When pulling an item from this roadmap into development:

1. Add or update the relevant `.feature` file (remove `@deferred` when starting).
2. Run `behavior-spec-author` for new behavior.
3. Implement per [`three-layer-architecture`](.cursor/skills/three-layer-architecture/SKILL.md).
4. Update this roadmap — move item to **Shipped** or adjust priority.

---

## Explicitly out of scope (for now)

- Multiplayer / real-time collaboration
- Full garment grading and sizing systems
- AI-generated pattern completion
- Marketplace / pattern sharing community
- Native mobile apps (web-first; responsive web may come in Phase 1)

---

## Revision history

| Date | Change |
|------|--------|
| 2026-08-30 | Phase 5 shipped: drape v2, round attachment copy, inc/dec shaping, drape toggle UX, spec continuity |
| 2026-08-25 | Phase 4 shipped: instanced meshes, code splitting, Rapier drape preview, attachment a11y |
| 2026-08-24 | Phase 3 shipped: save/load JSON, export/copy instructions, import validation, autosave |
| 2026-08-24 | Realism review fixes + per-strand outlines shipped |
| 2026-08-23 | Phase 2 shipped: HDC/DC, inc/dec, magic ring, templates, yarn color picker |
| 2026-08-23 | Phase 1 shipped: click-to-place, undo/redo, row turn direction, onboarding, collapsible panels |
| 2026-08-23 | Illustrated scene style shipped; SC V-stitch topology, flat background, outline stroke, UI/UX accessibility pass |
| 2026-08-22 | Engineering backlog items completed (validation unify, geometry dispose, store tests) |
| 2026-08-22 | Initial roadmap consolidated from MVP, skills, and agent passes |
