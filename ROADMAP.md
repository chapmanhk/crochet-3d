# Product roadmap

crochet-3d is a **3D crochet pattern designer** with a spec-first workflow: behavior is defined in [`specs/`](specs/), implemented across engine → store → scene → app, and verified with Vitest + Playwright.

This document is the **single source of truth for product direction**. When planning work, update this file and add or tag scenarios in `specs/*.feature` before coding.

---

## Vision

Help beginners and hobbyists **design crochet patterns visually** while learning correct structure — foundation chains, rows, stitch placement, and readable instructions — without needing to visualize the fabric in their head.

The 3D canvas is primary; panels explain status and next steps in plain crochet language.

---

## Shipped — v0.1 MVP (current)

| Capability | Specs | Notes |
|------------|-------|-------|
| App shell (toolbar, info panel, 3D canvas) | `app-shell.feature` | Skip link, empty-state guidance |
| Foundation chain (stepper dialog) | `foundation-chain.feature` | Default 10, keyboard + validation |
| Single crochet rows | `single-crochet-rows.feature` | Row progress, instructions |
| Pattern validation (disabled toolbar) | `pattern-validation.feature` | Proactive guards + tooltips |
| Reset / New Chain confirms | `reset-pattern.feature`, `foundation-chain.feature` | Accessible `ConfirmDialog` |
| Pure engine + diff-based 3D render | `@engine` tags | No physics yet |

**Stack:** TypeScript engine · Zustand store · R3F scene · React app · Gherkin specs · Vitest · Playwright

---

## Phase 1 — Interaction & polish (next)

Make the designer feel like a **creative tool**, not just a button-driven demo.

| Priority | Feature | Why | Spec target |
|----------|---------|-----|-------------|
| P0 | **Click-to-place SC** on 3D attachment points | Core creative-loop: see where stitches attach | New `click-to-place.feature` |
| P1 | **Undo / redo** last placement | Lowers cost of mistakes for beginners | `pattern-editing.feature` |
| P1 | **Row working direction** (turn logic) | Required for realistic patterns beyond flat rows | `single-crochet-rows.feature` |
| P2 | **Start Pattern onboarding** modal | First-run guidance for new users | `app-shell.feature` (`@deferred`) |
| P2 | **Responsive panels** (tablet/mobile) | Collapsible info panel, toolbar wrap | `app-shell.feature` |

**Exit criteria:** A crocheter can build a small flat piece by clicking attachment points in the canvas, undo a mistake, and understand row status without reading error banners.

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

## Phase 3 — Persistence & sharing

Let users keep and revisit work.

| Priority | Feature | Why | Spec target |
|----------|---------|-----|-------------|
| P0 | **Save / load pattern (JSON)** | Session continuity | New `persistence.feature` |
| P1 | **Export instructions** (copy / markdown) | Share patterns outside the app | `persistence.feature` |
| P2 | **Import from JSON** with validation | Recover files, future mobile sync | `persistence.feature` |
| P3 | **Cloud sync** | Multi-device — needs auth & backend | Out of scope until Phase 3 design spike |

**Exit criteria:** Round-trip save/load with Vitest fixtures; no data loss on refresh.

---

## Phase 4 — 3D preview at scale

Performance and realism for larger patterns.

| Priority | Feature | Why | Notes |
|----------|---------|-----|-------|
| P0 | **Instanced stitch meshes** | One mesh per stitch does not scale | Scene layer only |
| P1 | **Three.js code splitting** | Bundle currently >500 kB | Build config |
| P2 | **Rapier drape preview** | Optional physics preview | Separate preview layer; not in engine |
| P3 | **Stitch-level selection description** | Screen reader detail for canvas | `aria-live` + panel sync |

**Exit criteria:** Smooth orbit/preview with 500+ stitches on mid-range hardware.

---

## Engineering backlog (not user-facing)

| Item | Status | Notes |
|------|--------|-------|
| Unify engine `can*` and `throw` validation paths | **Done** | `validate*` private methods in `Pattern.ts` |
| Shared geometry disposal on HMR remount | **Done** | Per-instance geometries disposed in `StitchRenderer.dispose()` |
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
| 2026-08-22 | Engineering backlog items completed (validation unify, geometry dispose, store tests) |
| 2026-08-22 | Initial roadmap consolidated from MVP, skills, and agent passes |
