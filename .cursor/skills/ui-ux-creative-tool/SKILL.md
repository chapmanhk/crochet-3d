---
name: ui-ux-creative-tool
description: UI/UX for crochet-3d creative tool interfaces — toolbar over 3D canvas, pattern panels, onboarding, touch targets, WCAG accessibility, and beginner-friendly crochet copy. Use when designing or implementing app UI, error states, or interaction flows.
paths: src/app/**
---

# UI/UX for Creative Tools (crochet-3d)

Adapted from [ai-ux-skills](https://github.com/firassb/ai-ux-skills) (accessibility-expert, ux-writing) for a **3D crochet pattern designer** with canvas + overlay panels.

## Product context

Users are often **beginners** learning crochet while building a pattern. The UI must:

- Keep the **3D canvas primary** — panels float, never obscure the whole workspace
- Use **plain-language crochet terms** (foundation chain, row, single crochet)
- Show **clear next steps** when the canvas is empty or an action fails
- Work on **desktop and tablet** (touch targets, no hover-only affordances)

## Layout pattern

```
┌─────────────────────────────────────────────┐
│           [ Toolbar — centered top ]         │
│                              ┌─────────────┐ │
│                              │ Info panel  │ │
│         3D Canvas            │ (right)     │ │
│                              └─────────────┘ │
└─────────────────────────────────────────────┘
```

- Toolbar: primary actions (New Chain, Add SC, New Row)
- Info panel: row status, stitch count, instructions, errors
- Skip link → `#main-canvas` for keyboard users

## Accessibility (WCAG 2.1 AA target)

### Touch & click targets
- Minimum **44×44px** for all buttons (`.btn` in `styles.css`)
- Adequate spacing between toolbar buttons

### Keyboard
- All actions reachable without a mouse
- Skip-to-content link visible on focus
- Do not trap focus except in modals (future)
- Shortcut keys must not fire when typing in inputs/modals (when added)

### Screen readers
- `role="toolbar"` + `aria-label` on toolbar
- `aria-label` on info `aside`
- Errors use `role="alert"` (see `InfoPanel.tsx`)
- Dynamic stitch counts should update readable text, not rely on color alone

### Contrast
- Text on panels: **4.5:1** minimum
- Primary button: sufficient contrast for text and focus ring
- Error banner: readable text on `#fff1f0` background

### Canvas
- Canvas is visual; duplicate key state in the info panel (row, stitch count, instructions)
- Future: optional text description of selected stitch

## UX writing

### Buttons — action verbs, crochet-specific

| Avoid | Prefer |
|-------|--------|
| Submit | New Chain |
| OK | Dismiss |
| Error | Add a foundation chain first |
| Continue | New Row |

### Empty state
When no pattern exists:
- Explain what to do: *"Start with a foundation chain."*
- Point to the primary action (New Chain)

### Errors (what + how to fix)

Formula: **what happened** + **what to do next**

```
Add a foundation chain before placing single crochet stitches.
```

Use `PlacementError` messages from the engine; do not invent parallel copy in UI.

### Row labels
- Foundation row: **"Foundation"** not "Row 0 of 0"
- Working rows: **"Row N"**

## Interaction patterns (current MVP)

1. **New Chain** — hybrid stepper dialog (default 10, type or use −/+); confirm reset if pattern exists
2. **New Row** — advance row (engine validates)
3. **Add SC** — place next stitch in current row
4. **Reset** — destructive; consider confirm dialog when pattern has work

## Future UI (do not implement unless asked)

- Click-to-place on 3D attachment points
- Start Pattern onboarding modal
- Templates panel
- Color picker for yarn
- Mobile collapsible panels

## Component checklist

When adding UI, verify:

- [ ] 44×44px touch target
- [ ] Visible focus style
- [ ] Loading/disabled state if action can fail
- [ ] Error surfaced via `lastError` or inline validation
- [ ] No crochet logic in components — call store actions only
- [ ] Instructions panel stays in sync with engine output

## CSS conventions

- Panels: `.panel` with fixed positioning, high z-index over canvas
- Buttons: `.btn`, `.btn.primary`, `.btn.subtle`
- Muted helper text: `.muted`
- Keep styles in `src/app/styles.css` until component-scoped CSS is needed

## References

- [ai-ux-skills accessibility-expert](https://github.com/firassb/ai-ux-skills/tree/main/skills/accessibility-expert)
- [ai-ux-skills ux-writing](https://github.com/firassb/ai-ux-skills/tree/main/skills/ux-writing)
