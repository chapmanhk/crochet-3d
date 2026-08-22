---
name: code-style
description: TypeScript and React code style for crochet-3d. Use when writing or reviewing TypeScript, React components, or engine modules.
---

# TypeScript & React Code Style

## Formatting

- 2-space indentation
- Semicolons required
- Single quotes for strings (match existing files)
- Trailing commas in multi-line collections
- Max line length: ~100 characters (soft)

## Naming

| Kind | Convention | Example |
|------|------------|---------|
| Files (engine) | PascalCase for classes, camelCase for utilities | `Pattern.ts`, `layout.ts` |
| Files (React) | PascalCase components | `Toolbar.tsx` |
| Functions / variables | camelCase | `addFoundationChain` |
| Types / interfaces | PascalCase | `StitchNode`, `PatternSnapshot` |
| Constants | UPPER_SNAKE_CASE | `MAX_CHAIN_LENGTH` |
| React components | PascalCase | `InfoPanel` |

## TypeScript

- `strict` mode is enabled — no implicit `any`
- Prefer `interface` for object shapes; `type` for unions and aliases
- Use `as const` for string literal enums (see `StitchType`)
- Export types from `src/engine/index.ts` for consumers
- Avoid `!` non-null assertions unless immediately guarded

## Imports

Order: external packages → `@engine` / `@store` / `@scene` / `@app` → relative

```typescript
import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Pattern } from '@engine/index';
import { usePatternStore } from '@store/patternStore';
```

Use path aliases from `vite.config.ts`; do not use deep relative paths across layers.

## React

- Functional components only
- Colocate component styles in `src/app/styles.css` until a CSS module need arises
- Select minimal Zustand state slices: `usePatternStore((s) => s.stitches)`
- Prefer `type="button"` on toolbar buttons
- Use semantic HTML (`main`, `aside`, `dl`, `role="toolbar"`)

## Engine

- No classes required beyond `Pattern` and `StitchGraph` — prefer plain functions for utilities
- Throw `PlacementError` for invalid user operations
- Keep side effects out of pure layout/instruction functions

## Commands

```bash
npm run build    # tsc --noEmit && vite build
npm run test:run # vitest run
```
