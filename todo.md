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

- [ ] **Bug: “Add Stitch” auto-starts a new row and places a stitch**
  - **Symptoms:** Clicking “Add Stitch” when row is complete starts a new row
    and immediately adds a stitch. Clicking the orange “new row” ghost only
    starts the row.
  - **Fix:** Make both paths consistent. Either both should only start a row
    or both should start a row + place the first stitch (with a user setting).

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

