# Behavior specifications

Gherkin feature files describe **what crochet-3d should do** from a crocheter's perspective. These are the review artifact — read and approve specs before implementation.

## Workflow

1. **Author** — use the `behavior-spec-author` agent or `behavior-specs` skill to write/update `.feature` files
2. **Review** — confirm scenarios match what you want
3. **Implement** — code changes in `src/` follow approved specs
4. **Verify** — `@e2e` scenarios → Playwright; `@engine` scenarios → Vitest

## Files

| Feature | Covers |
|---------|--------|
| `app-shell.feature` | App load, toolbar, canvas, empty state |
| `foundation-chain.feature` | Creating a foundation chain |
| `single-crochet-rows.feature` | New row, adding SC, instructions |
| `pattern-validation.feature` | Input errors, placement guards |
| `reset-pattern.feature` | Clearing the pattern |

## Tags

- `@e2e` — proven by Playwright tests in `e2e/`
- `@engine` — proven by Vitest tests in `tests/engine/`

## Cursor

- Agent: `.cursor/agents/behavior-spec-author.md`
- Skill: `.cursor/skills/behavior-specs/SKILL.md`
