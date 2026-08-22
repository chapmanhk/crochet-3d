---
name: behavior-specs
description: Write Gherkin behavior specifications in specs/ for crochet-3d. Use when defining user-facing behavior, reviewing acceptance criteria, starting new features, or mapping scenarios to Playwright E2E tests.
paths: specs/**, specs/**/*
---

# Behavior Specifications (Gherkin)

Human-readable behavior specs are the **source of truth** for what crochet-3d should do from a user's perspective. Implementation and tests follow specs — not the other way around.

Adapted from BDD practices and [tekhne bdd-testing](https://github.com/pantheon-org/tekhne/blob/main/skills/testing/bdd-testing/SKILL.md).

## Workflow

1. **Specify** — write or update `specs/*.feature`
2. **Review** — user confirms scenarios match intent
3. **Implement** — engine → store → scene → app
4. **Verify** — Playwright (`@e2e`) and Vitest (`@engine`)

## File organization

```
specs/
  app-shell.feature           # Initial load, layout, empty state
  foundation-chain.feature    # Starting a pattern
  single-crochet-rows.feature # Building rows with SC
  pattern-validation.feature  # Errors and guards
  reset-pattern.feature       # Clearing work
```

One feature per user-facing capability. Split when a file exceeds ~8 scenarios.

## Feature file template

```gherkin
@e2e
Feature: Feature name
  As a crocheter
  I want <goal>
  So that <benefit>

  Background:
    Given I am using the crochet pattern designer

  Scenario: Scenario name
    Given <precondition>
    When <action>
    Then <observable outcome>
    And <additional outcome>
```

## Step phrase conventions

Use consistent wording across features:

| Step | Phrase |
|------|--------|
| App open | `Given I am using the crochet pattern designer` |
| No pattern | `Given I have no pattern` |
| Foundation exists | `Given I have a foundation chain of <n>` |
| On row | `And I am on row <n>` |
| SC count | `And I have placed <n> single crochet stitches on the current row` |
| Click action | `When I choose "New Chain" and enter <n> in the chain length dialog` |
| Open chain dialog | `When I open the new chain dialog` |
| Button click | `When I choose "<button>"` |
| Status | `Then the pattern status should be "<text>"` |
| Stitch count | `And the stitch count should be <n>` |
| Instructions | `And the instructions should include "<text>"` |
| Error | `Then I should see an error "<message>"` |

## Tags

| Tag | Meaning |
|-----|---------|
| `@e2e` | Requires Playwright test in `e2e/` |
| `@engine` | Engine-only; Vitest in `tests/engine/` |
| `@wip` | Specified but not yet implemented |
| `@deferred` | Agreed future behavior |

## Rules

### Do
- Write from the **crocheter's perspective**
- Make Then steps **observable** (UI text, counts, messages)
- Include **error scenarios** alongside happy paths
- Keep scenarios **independent** (use Background/Given for setup)

### Don't
- Reference React, Three.js, Zustand, or file paths in steps
- Use implementation jargon ("call addFoundationChain")
- Write untestable outcomes ("3D looks correct" — defer or tag `@deferred`)

## Review checklist (for user)

Before implementation, confirm:

- [ ] Scenarios describe the behavior you want
- [ ] Error messages match the tone you want for beginners
- [ ] Edge cases you care about are covered
- [ ] Out-of-scope items are tagged `@deferred` or omitted

## Linking to Playwright

Each `@e2e` scenario should eventually map to one Playwright test. Name tests after scenarios:

```typescript
// e2e/app.spec.ts
test('Scenario: Create a foundation chain', async ({ page }) => { ... });
```

When specs change, update Playwright in the same PR.

## Linking to engine tests

`@engine` scenarios for rules without UI (row full, placement errors) map to Vitest:

```typescript
it('Scenario: Cannot start a new row before the current row is complete', () => { ... });
```
