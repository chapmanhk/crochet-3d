# Cursor configuration for crochet-3d

Project-level agents and skills for the three-layer crochet pattern designer.

## Layout

```
.cursor/
  agents/     Subagents for review, tests, docs, verification, engine work
  skills/     On-demand skills loaded when tasks match their description
```

Adapted from [ChernyCode](https://github.com/meleantonio/ChernyCode) and tailored to this repo's TypeScript + React + Vite + R3F stack.

## Agents

| Agent | Use when |
|-------|----------|
| `code-reviewer` | Reviewing PRs or validating implementation quality |
| `test-writer` | Adding Vitest coverage for engine or integration tests |
| `doc-generator` | Updating README, JSDoc, or architecture docs |
| `verifier` | Confirming claimed work actually runs and passes checks |
| `engine-specialist` | Crochet graph, placement rules, layout, instructions |
| `behavior-spec-author` | Writing Gherkin specs in `specs/` **before** implementation |
| `code-simplifier` | Readability pass after features — simplify without changing behavior |
| `tech-debt` | Audit/fix duplication, dead code, layer leaks, spec/test drift |

Invoke via Cursor's agent picker or by referencing the agent file in chat.

## Skills

| Skill | Use when |
|-------|----------|
| `behavior-specs` | Defining or reviewing Gherkin acceptance criteria |
| `code-style` | Writing or reviewing TypeScript/React code |
| `git-workflow` | Branching, commits, PRs |
| `testing` | Vitest conventions and commands |
| `three-layer-architecture` | Changes that cross engine / store / scene / app boundaries |
| `ui-ux-creative-tool` | UI panels, toolbar, onboarding, accessibility for the designer |
| `crochet-realism-reviewer` | Audit stitch geometry vs real crochet anatomy; plan Rapier drape |
| `code-simplifier` | Post-feature cleanup — reduce complexity, dedupe within layers |
| `tech-debt` | Find/fix debt — dead code, shortcuts, spec-test drift, layer smells |

Skills auto-load when the agent detects a matching task from the `description` frontmatter.

## Product roadmap

Phases, priorities, and deferred work: [`ROADMAP.md`](../ROADMAP.md) (repo root)

## Suggested workflow order

For a feature branch nearing merge:

1. `behavior-spec-author` — specs first (if behavior changed)
2. Implement + `test-writer`
3. `code-reviewer`
4. `tech-debt` — structural cleanup
5. `code-simplifier` — readability pass
6. `verifier` — final proof

## Pre-commit checklist

```bash
npm run test:run
npm run test:e2e
npm run build
```
