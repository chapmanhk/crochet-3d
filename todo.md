# Crochet Pattern UI - Bug List & Proposed Fixes

This list captures UI/logic issues observed while creating a simple scarf
via click-based interactions, plus recommended fixes.

## Foundations & Row Basics

- [ ] **Bug: No explicit “Start Pattern” action**
  - **Symptoms:** Empty canvas has no clickable ghosts; user must press
    “Add Stitch” to discover the foundation chain prompt.
  - **Fix:** Add a primary “Start Pattern” button (or onboarding modal) that
    offers foundation chain, foundation SC, or magic ring options.

- [x] **Bug: Foundation chain off-by-one guidance missing**
  - **Symptoms:** Row 1 allows working into every chain, but typical crochet
    starts in 2nd chain from hook (e.g., sc foundation yields N-1 sts).
  - **Fix:** When a foundation chain is created, auto-set "Skip" to 1 for the
    first stitch (or show a prompt for start offset) and reset to 0 after the
    first placement. Also show a hint in the UI.
  - **Status:** Fixed - UIManager auto-sets skip to 1 after foundation chain and resets after first stitch.

- [x] **Bug: "Add Stitch" auto-starts a new row and places a stitch**
  - **Symptoms:** Clicking "Add Stitch" when row is complete starts a new row
    and immediately adds a stitch. Clicking the orange "new row" ghost only
    starts the row.
  - **Fix:** Make both paths consistent. Either both should only start a row
    or both should start a row + place the first stitch (with a user setting).
  - **Status:** Fixed - "Add Stitch" now only starts the row (consistent with ghost behavior).

## Row Navigation & View State

- [x] **Bug: Row navigation index is inconsistent with foundation chain**
  - **Symptoms:** The display hides the foundation row, but "Go to Row 1"
    navigates to row 0 (foundation). The UI shows "Row 0 of 0" with only a chain.
  - **Fix:** Use a consistent display index. If foundation exists, map display
    row 1 -> internal row 1, and show "Foundation" as a special entry.
  - **Status:** Fixed - handleGoToRow now maps display rows correctly based on foundation presence.

- [x] **Bug: Row navigation does not refresh attachments or info panel**
  - **Symptoms:** Clicking prev/next or Go to Row updates the row display, but
    ghost attachments and info panel can remain stale.
  - **Fix:** On `ROW_NAVIGATED`, trigger `updateAttachmentPoints()` and
    `updateInfoPanel()`.
  - **Status:** Fixed - Added ROW_NAVIGATED listeners in AttachmentPointManager and UIManager.

- [x] **Bug: Working direction can be wrong after large row jumps**
  - **Symptoms:** `goToRow` toggles direction by row delta parity instead of
    target row parity.
  - **Fix:** In flat mode, set working direction based on target row parity:
    e.g., even rows -> right, odd rows -> left (or whichever matches row 1).
  - **Status:** Fixed - goToRow now sets direction based on target row parity (even=left, odd=right).

## Stitch Options & Pattern Output

- [x] **Bug: Loop selection (FLO/BLO) not reflected in instructions**
  - **Symptoms:** Pattern instructions omit loop selection even if set.
  - **Fix:** Include loop selection in `getStitchDisplayName` or per-stitch
    metadata when generating instructions.
  - **Status:** Fixed - generateInstructions now includes loopSelection as FLO/BLO modifier.

- [x] **Bug: Skip and "work into space" are not reflected in instructions**
  - **Symptoms:** Generated instructions omit skips and ch-space instructions.
  - **Fix:** Include "sk N," "in ch-sp," or equivalent notation in output.
  - **Status:** Fixed - generateInstructions now includes skip counts and chain space notation.

- [x] **Bug: Increase modifier does not add stitch count**
  - **Symptoms:** Increases add a single node with `connectionsOut = 2`, but
    row stitch counts (and instructions) stay at 1.
  - **Fix:** Either (a) model increases as multiple stitches, or (b) keep a
    single node but compute "working stitch count" separately for output.
  - **Status:** Fixed - generateInstructions now counts increases as 2 or 3 stitches based on metadata.increasesTo.

- [x] **Bug: Decrease modifiers ignore working direction**
  - **Symptoms:** Decrease uses `attachIndex + i` in sorted order even if
    working right-to-left.
  - **Fix:** Adjust the traversal direction for decreases based on
    `workingDirection` to ensure correct neighbor selection.
  - **Status:** Fixed - Pattern.js and StitchValidator now respect workingDirection for decreases and skips.

## Attachment Modes & UX Feedback

- [x] **Bug: "Work into space" hides normal attachments**
  - **Symptoms:** If no chain spaces are present, the UI shows no attachments
    and suggests a new row even if unworked stitches remain.
  - **Fix:** When "work into space" yields zero spaces, show normal attachments
    with a warning or auto-disable the toggle for that row.
  - **Status:** Fixed - Falls back to normal attachments when no chain spaces exist.

- [x] **Bug: Advanced stitch validation unused**
  - **Symptoms:** Post and spike stitches can be placed in invalid contexts
    without warnings. Validator exists but is not invoked.
  - **Fix:** Call `StitchValidator.canPlaceStitch` before placing stitches and
    show warnings/errors in the UI for invalid placements.
  - **Status:** Fixed - UIManager now validates via StitchValidator before placing stitches.

## Templates & Starting Methods

- [ ] **Bug: Templates exist but are inaccessible in the UI**
  - **Symptoms:** `PatternTemplates` is unused in UI; no entry point for
    granny square, circle, square, or triangle.
  - **Fix:** Add a “Templates” panel to create starter patterns.

- [ ] **Bug: No UI for alternate starts**
  - **Symptoms:** Foundation SC, foundation DC, and magic ring exist in core
    but cannot be selected from the UI.
  - **Fix:** Add a “Start Method” modal on new pattern with these options.

## Color & Selection

- [ ] **Bug: Color changes apply only to future stitches**
  - **Symptoms:** Selecting stitches doesn’t allow recolor.
  - **Fix:** Add “Apply color to selection” action in the info panel.

## Limits & Guidance

- [x] **Bug: Max chain length (100) is small for scarves**
  - **Symptoms:** Long scarf foundations can exceed 100 chains.
  - **Fix:** Increase `MAX_CHAIN_LENGTH` or make it configurable in UI.
  - **Status:** Fixed - Increased MAX_CHAIN_LENGTH from 100 to 500.

## QA Stress Test Findings (Jan 2026)

- [ ] **Bug: Physics update callbacks accumulate over time**
  - **Symptoms:** Clicking "Settle" or starting/stopping physics repeatedly
    causes the simulation to run multiple times per frame and CPU usage grows.
  - **Fix:** Store and call the unsubscribe from `SceneManager.onUpdate()` and
    avoid registering duplicate update callbacks on subsequent `start()` calls.

- [ ] **Bug: Clicking ghost attachments bypasses stitch validation**
  - **Symptoms:** Invalid stitches (e.g., post/spike/decrease) can be placed by
    clicking ghost meshes even though the toolbar/Enter path blocks them.
  - **Fix:** Invoke `StitchValidator.canPlaceStitch` inside
    `AttachmentPointManager.onClick()` and surface errors via modal.

- [ ] **Bug: "Work into space" mode can force a new row unexpectedly**
  - **Symptoms:** When no chain spaces exist, ghosts disappear and a new-row
    indicator appears even if unworked stitches remain.
  - **Fix:** Add a fallback to normal attachment points in
    `AttachmentPointManager.updateAttachmentPoints()` or disable the toggle
    for that row with a warning.

- [ ] **Bug: Undo/redo to empty graph sets currentRow to -1**
  - **Symptoms:** After undoing to an empty state, row navigation and
    attachments can break because `currentRow` becomes negative.
  - **Fix:** Clamp `currentRow` to 0 in `Pattern.loadState()` when row count is 0.

- [ ] **Bug: Skip count UI is out of sync after foundation chain**
  - **Symptoms:** The app sets `currentSkipCount = 1` but the UI still shows 0,
    causing unexpected skipped stitches.
  - **Fix:** Update `UIManager.updateSkipInput()` to target the correct element
    (`#input-skip-count`) and avoid referencing undefined `this.stitchOptions`.

- [ ] **Bug: Selection persists across pattern loads**
  - **Symptoms:** Selected nodes from a previous pattern remain in
    `RaycastManager.selectedNodes`, and Delete attempts remove stale nodes.
  - **Fix:** Clear selection on `PATTERN_LOADED`/`PATTERN_CLEARED` and prune
    selections on `STITCH_REMOVED`.

- [ ] **Bug: Magic ring counted as a stitch in instructions**
  - **Symptoms:** Instruction row counts include the magic ring node, inflating
    stitch totals and row summaries.
  - **Fix:** Exclude `StitchType.MAGIC_RING` from instruction rows or treat it
    as a special foundation note only.

- [ ] **Bug: Turning-chain-only rows render trailing commas**
  - **Symptoms:** Instructions show "Ch N, " when a row has only turning chains.
  - **Fix:** When `workingStitches` is empty, omit the comma and skip joining
    an empty instruction list.

- [ ] **Bug: Keyboard shortcut log is misleading for Physics panel**
  - **Symptoms:** Console says "P - Toggle physics panel" but "P" selects
    Puff stitch and does not toggle the panel.
  - **Fix:** Either implement a `P` key handler to toggle PhysicsPanel or
    change the shortcut hint to avoid conflicts.

- [ ] **Bug: Keyboard shortcuts still fire inside selects/modals**
  - **Symptoms:** Pressing stitch/view shortcuts while a `<select>` is focused
    or a modal is open still triggers app actions.
  - **Fix:** In `UIManager.onKeyDown`, ignore events from `SELECT` elements,
    contentEditable nodes, and when a modal overlay is active.

- [ ] **Bug: Suggested ghost highlight is lost after hover**
  - **Symptoms:** Hovering over the suggested attachment point resets its
    scale to default, losing the "suggested" emphasis.
  - **Fix:** When unhovering, restore the suggested scale if
    `attachmentPoint.suggested` is true.

- [ ] **Bug: Templates can leave workingDirection inconsistent**
  - **Symptoms:** Continuing after template creation may suggest the wrong
    next stitch because `workingDirection` isn't aligned to the last row.
  - **Fix:** After template build, set `workingDirection` based on the last
    row parity (or call `pattern.goToRow(currentRow)` to sync).

- [ ] **Bug: Go-to-row input min conflicts with foundation row**
  - **Symptoms:** With a foundation chain, row 0 should be valid but the
    input `min="1"` blocks it in some browsers.
  - **Fix:** Set the input `min` dynamically (0 if foundation exists, else 1)
    and update on PATTERN_LOADED/ROW_ADDED.

