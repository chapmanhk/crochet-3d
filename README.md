# Crochet 3D

Fresh scaffold for a three-layer crochet pattern designer.

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

## MVP flow

1. Click **New Chain** and enter a foundation length
2. Click **New Row** to move to row 1
3. Click **Add SC** to place single crochet stitches across the row
4. Repeat **New Row** / **Add SC** for additional rows

## Spec-first workflow

Behavior specs in [`specs/`](specs/) describe user-facing functionality in Gherkin (Given/When/Then). Review and approve specs before implementation.

1. **Specify** — `behavior-spec-author` agent writes `specs/*.feature`
2. **Review** — confirm scenarios match intent
3. **Implement** — engine → store → scene → app
4. **Verify** — `npm run test:run` + `npm run test:e2e`

See [`ROADMAP.md`](ROADMAP.md) for product phases, priorities, and how deferred work is tracked.

## Architecture rules

- `src/engine` must not import from React, Three.js, or Zustand
- Scene updates from engine snapshots via diff-based mesh sync
- Physics/drape is intentionally deferred

## Cursor agents & skills

See [`.cursor/README.md`](.cursor/README.md) for project agents (code review, tests, engine specialist) and skills (architecture, UI/UX, testing).

## Roadmap

Product phases and priorities: [`ROADMAP.md`](ROADMAP.md)
