# Crochet 3D

A three-layer crochet pattern designer: build patterns in 3D, read human-friendly instructions, and save or share your work.

## Stack

- **Engine** (`src/engine`): pure TypeScript crochet graph, placement rules, layout, instructions
- **Scene** (`src/scene`): React Three Fiber shell + imperative stitch renderer
- **App** (`src/app`): React UI
- **Store** (`src/store`): Zustand bridge between UI and engine

## Scripts

```bash
npm install
npm run dev
npm run test:run
npm run test:e2e
npm run build
```

CI runs the same test and build commands on every push and pull request to `main` (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## MVP flow

1. Click **New foundation** and choose a chain or magic ring
2. Click **New Row** to move to row 1
3. Click **Add SC** (or the selected stitch type) to place stitches across the row
4. Repeat **New Row** / **Add** for additional rows

## Persistence

Save, load, and export patterns from the toolbar **Pattern file** group (`src/engine/persistence.ts`).

| Action | What it does |
|--------|----------------|
| **Save pattern** | Downloads a versioned `.json` file with the pattern snapshot plus UI state (yarn color, selected stitch type). Disabled until the pattern has stitches. |
| **Load pattern** | Opens a file picker for `.json` files saved from this app. If you already have work in progress, confirms before replacing it. Invalid files show a user-facing error. |
| **Copy instructions** | Copies numbered plain-text instructions to the clipboard. |
| **Export instructions** | Downloads a `.md` file with the same instructions in markdown. |

**Autosave:** While you work, the app writes the same JSON format to `localStorage` (`crochet-3d-autosave`). After a refresh, your last pattern is restored automatically with a notice. Empty patterns clear autosave. Manual **Save pattern** remains available if storage is unavailable.

**Import validation:** Loaded files must match `PATTERN_FILE_VERSION` (currently `1`). The engine checks stitch graph integrity (ids, parent links, foundation bounds, row/column indices, increase/decrease semantics) and throws `PatternPersistenceError` with readable messages on failure.

## Scale preview (Phase 4)

Performance and accessibility improvements for larger patterns (`specs/scale-preview.feature`).

| Capability | Where | What it does |
|------------|-------|----------------|
| **Instanced stitch meshes** | `src/scene/instancedStitches.ts`, `StitchRenderer` | Flat working rows with ≥4 stitches render via `THREE.InstancedMesh` batches keyed by shared prototype geometry. Foundation rows, round work, and row joins stay on merged strand geometry. |
| **Lazy 3D load** | `src/app/LazyCrochetScene.tsx`, `vite.config.ts` | The canvas loads through `React.lazy` so the initial bundle stays small. Vite splits `react-vendor`, `engine`, `store`, `scene`, `three`, `r3f`, and `rapier` chunks; Rapier and the drape layer load only when needed. |
| **Drape preview toggle** | Toolbar **Drape preview** button, `LazyDrapePreview` | Optional Rapier spring-linked proxy (loop + post constraints on working-row stitches) for illustrative hang preview. Off by default; toggling on lazy-loads `@react-three/rapier` and `preview/DrapePreviewLayer`. |
| **Attachment target description** | `InfoPanel`, `getAttachmentTargetDescription` | When a stitch can be placed, the info panel announces which foundation or prior-row stitch is the next attachment target (e.g. “Next single crochet attaches to stitch 3 of 6 in row 1”). Synced for screen readers via `aria-live`. |

**Large swatch template:** Toolbar **Templates → Large swatch** loads a 120-stitch pattern to exercise instanced rendering and responsive orbit controls.

## Spec-first workflow

Behavior specs in [`specs/`](specs/) describe user-facing functionality in Gherkin (Given/When/Then). Review and approve specs before implementation.

1. **Specify** — `behavior-spec-author` agent writes `specs/*.feature`
2. **Review** — confirm scenarios match intent
3. **Implement** — engine → store → scene → app
4. **Verify** — `npm run test:run` + `npm run test:e2e`

See [`ROADMAP.md`](ROADMAP.md) for product phases, priorities, and how deferred work is tracked.

## Architecture rules

- `src/engine` must not import from React, Three.js, or Zustand
- Scene updates from engine snapshots via row-level yarn segment sync with fingerprint caching; stitch height is scene-only (`VISUAL_ROW_HEIGHT`), decoupled from engine layout
- Full yarn physics is deferred; optional drape preview uses a lightweight Rapier proxy layer, not stitch-accurate simulation

## 3D scene (illustrated style)

The canvas uses a **flat warm background** (`#f7f0e6`) with no perspective grid — an illustrated look, not a 3D workshop floor.

Stitches are rendered imperatively by `StitchRenderer`:

- **Foundation row** — chain loops and spine segments (merged geometry)
- **Working rows** — inverted-V single crochet arcs with legs through the row below, joined by top working-yarn bridges; flat rows with ≥4 stitches use instanced meshes batched by prototype
- **Row joins** — yarn path between consecutive rows (merged geometry)
- **Outline** — screen-space stroke (~2.5 px) in a darker yarn tone (not a drop shadow)
- **Row stacking** — scene-only `VISUAL_ROW_HEIGHT` (0.22); engine layout Y (`ROW_HEIGHT` = 1.2) drives placement math only
- **Drape preview** — optional Rapier spring-linked proxy layer behind illustrated stitches (toolbar toggle)

Visual behavior is tested in `tests/scene/`; crocheter-facing behavior is specified in `specs/*.feature`.

## Cursor agents & skills

See [`.cursor/README.md`](.cursor/README.md) for project agents (code review, tests, engine specialist) and skills (architecture, UI/UX, testing).

## Roadmap

Product phases and priorities: [`ROADMAP.md`](ROADMAP.md)
