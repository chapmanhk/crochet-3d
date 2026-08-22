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

Invoke via Cursor's agent picker or by referencing the agent file in chat.

## Skills

| Skill | Use when |
|-------|----------|
| `code-style` | Writing or reviewing TypeScript/React code |
| `git-workflow` | Branching, commits, PRs |
| `testing` | Vitest conventions and commands |
| `three-layer-architecture` | Changes that cross engine / store / scene / app boundaries |
| `ui-ux-creative-tool` | UI panels, toolbar, onboarding, accessibility for the designer |

Skills auto-load when the agent detects a matching task from the `description` frontmatter.

## Pre-commit checklist

```bash
npm run test:run
npm run test:e2e
npm run build
```
