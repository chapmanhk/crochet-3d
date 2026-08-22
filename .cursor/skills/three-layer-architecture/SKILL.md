---
name: three-layer-architecture
description: Three-layer architecture rules for crochet-3d (engine, store, scene, app). Use when adding features, refactoring, or reviewing cross-layer changes.
---

# Three-Layer Architecture

crochet-3d separates **crochet logic**, **state bridge**, **3D rendering**, and **UI**.

```
src/
  engine/    Pure TypeScript — graph, placement, layout, instructions
  store/     Zustand — syncs engine snapshots to React
  scene/     R3F + imperative Three.js — renders stitches from snapshots
  app/       React UI — toolbar, panels, styles
```

## Layer rules

### Engine (`src/engine/`)

- **No imports** from `react`, `three`, `@react-three/*`, or `zustand`
- Owns `Pattern`, `StitchGraph`, `PlacementError`, positions, instructions
- Exposes snapshots via `pattern.getSnapshot()`
- All placement validation happens here

### Store (`src/store/`)

- Holds a module-scoped `Pattern` instance
- Actions call engine methods, then `set(syncState())`
- Surfaces `PlacementError.message` as `lastError`
- Does not compute layout or render meshes

### Scene (`src/scene/`)

- R3F `Canvas` for camera, lights, controls
- `StitchRenderer` (imperative) syncs meshes by stitch ID diff
- Reads stitch positions from engine snapshots — never invents placement
- No crochet placement rules

### App (`src/app/`)

- React components for toolbar and info panel
- Uses `usePatternStore` selectors
- WCAG-minded touch targets and semantics
- No Three.js imports

## Data flow

```
User action → store action → engine mutation → snapshot → store state → scene sync + UI re-render
```

## Adding a feature (checklist)

1. **Engine** — types, placement, layout, instructions, tests
2. **Store** — action + error handling if user-facing
3. **Scene** — geometry/material if new stitch shape
4. **App** — button, panel, or feedback

## Anti-patterns

- Placement logic in `StitchRenderer` or React components
- One React `<mesh>` per stitch at scale (use imperative renderer)
- Physics/drape in engine (deferred to future Rapier preview layer)
- Duplicating graph state in Zustand beyond snapshots

## Path aliases

Configured in `vite.config.ts` and `vitest.config.ts`:

- `@engine` → `src/engine`
- `@store` → `src/store`
- `@scene` → `src/scene`
- `@app` → `src/app`

## Related docs

- `README.md` — MVP flow and scripts
- `.cursor/agents/engine-specialist.md` — engine-focused agent
