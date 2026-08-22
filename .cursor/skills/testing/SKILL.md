---
name: testing
description: Vitest testing conventions for crochet-3d. Use when writing engine tests, running test suites, or verifying placement logic.
---

# Testing Standards

## Framework

- **Vitest** for all tests
- Config: `vitest.config.ts`
- Engine tests run in `node` environment (no jsdom required)

## File organization

```
tests/
  engine/
    Pattern.test.ts
    layout.test.ts
    instructions.test.ts
```

Mirror `src/engine/` structure. Name files `<Module>.test.ts`.

## Conventions

- Use `describe` / `it` from `vitest`
- Import from `@engine/index` or specific engine modules
- One behavior per `it` block
- Use `expect(() => ...).toThrow(PlacementError)` for validation

## Example

```typescript
import { describe, expect, it } from 'vitest';
import { Pattern, PlacementError } from '@engine/index';

describe('Pattern', () => {
  it('rejects duplicate foundation chains', () => {
    const pattern = new Pattern();
    pattern.addFoundationChain(3);
    expect(() => pattern.addFoundationChain(3)).toThrow(PlacementError);
  });
});
```

## What to test where

| Layer | Test? | How |
|-------|-------|-----|
| `src/engine/` | **Yes** | Unit tests in `tests/engine/` |
| `src/store/` | Rarely | Only non-trivial bridge logic |
| `src/scene/` | Later | Mock Three.js if needed |
| `src/app/` | Later | Playwright E2E when requested |

## Commands

```bash
npm test              # vitest watch mode
npm run test:run      # single run (CI / pre-commit)
npm run build         # includes tsc --noEmit
```

## Coverage

No enforced threshold yet. Prioritize engine branches and `PlacementError` paths.
