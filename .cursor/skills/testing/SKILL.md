---
name: testing
description: Vitest, Playwright, and Gherkin behavior spec conventions for crochet-3d. Use when writing engine tests, E2E flows, mapping specs to tests, or running test suites.
---

# Testing Standards

## Framework

- **Vitest** — engine unit tests (`vitest.config.ts`, `node` environment)
- **Playwright** — browser E2E tests (`playwright.config.ts`, `e2e/`)

## File organization

```
specs/              # Gherkin behavior specs (review before coding)
tests/
  engine/           # Vitest unit tests (@engine scenarios)
e2e/                # Playwright browser tests (@e2e scenarios)
```

## Spec-first workflow

1. Write or update `specs/*.feature` (use `behavior-spec-author` agent)
2. User reviews scenarios
3. Implement code
4. Map `@e2e` scenarios to Playwright; `@engine` scenarios to Vitest

See `.cursor/skills/behavior-specs/SKILL.md` for Gherkin conventions.

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
| `src/app/` | **Yes** | Playwright E2E in `e2e/` |

## Commands

```bash
npm test              # vitest watch mode
npm run test:run      # single run (CI / pre-commit)
npm run test:e2e      # Playwright browser tests
npm run build         # includes tsc --noEmit
```

## Coverage

No enforced threshold yet. Prioritize engine branches and `PlacementError` paths.
