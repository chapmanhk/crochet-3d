---
name: git-workflow
description: Git workflow and commit conventions for crochet-3d. Use when committing code, creating branches, or opening pull requests.
---

# Git Workflow

## Branch strategy

- `main` is always deployable
- Feature branches from `main`
- Cloud Agent branches: `cursor/<descriptive-name>-<suffix>` (e.g. `cursor/scaffold-three-layer-d578`)

## Conventional commits

| Prefix | Use for |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `style:` | Formatting, no logic change |
| `refactor:` | Code change without feature/fix |
| `test:` | Adding or updating tests |
| `chore:` | Tooling, dependencies, `.cursor` config |

Examples:
```
feat: add click-to-place single crochet in scene
fix: surface PlacementError when row is full
docs: document three-layer architecture in README
chore: add Cursor agents and skills
```

## Pre-commit checklist

```bash
npm run test:run
npm run build
git diff   # review changes
```

## Pull requests

- Descriptive title summarizing the change
- Note which layer(s) changed: engine / store / scene / app
- Include test plan (`npm run test:run`, manual steps for UI)
- Do not commit `node_modules/`, `dist/`, or secrets

## Files to never commit

- `.env` with secrets
- `node_modules/`
- `dist/` (build output)
- API keys or tokens

## Push

```bash
git push -u origin <branch-name>
```

Use the ManagePullRequest tool for creating/updating PRs in Cloud Agent runs.
