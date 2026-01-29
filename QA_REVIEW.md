# QA Review: Crochet-3D Pattern Designer
## Review by a QA Crocheter

**Date:** 2026-01-29
**Reviewer Perspective:** QA engineer with intimate knowledge of crocheting and pattern construction

---

## Executive Summary

This review examines the Crochet-3D application from both a crochet domain accuracy perspective and a software quality perspective. While the application demonstrates solid technical foundations, there are several issues that would confuse or frustrate experienced crocheters, as well as software bugs that could cause unexpected behavior.

---

## Part 1: Crochet Domain Issues

### 1.1 CRITICAL: Incorrect Half-Double Crochet Turning Chain Behavior

**Location:** `src/core/StitchTypes.js:102-108`

**Issue:** The code says HDC turning chain "counts as first stitch" (`TurningChainCountsAsStitch[HALF_DOUBLE_CROCHET]: true`), but this is **debatable and varies by pattern convention**. Many crocheters and patterns treat the HDC turning chain (ch 2) as NOT counting as a stitch because it's shorter than a DC.

**Real-World Impact:** Users following the software's guidance may end up with incorrect stitch counts at row ends.

**Recommendation:** Make this configurable per-pattern, defaulting to `false` for HDC as that's the more common modern convention.

---

### 1.2 CRITICAL: Granny Square Template is Structurally Incorrect

**Location:** `src/core/PatternTemplates.js:39-98`

**Issue:** The granny square template creates the stitches in a fundamentally wrong way:
1. All DC stitches in round 1 connect directly to the magic ring (`pattern.graph.connectVertical(node, ring)`)
2. This is correct, BUT the corner chains (ch-2) are connected horizontally to the DCs instead of being worked into the ring
3. Real granny squares have: `ch 3 (counts as dc), 2 dc, ch 2, *3 dc, ch 2* repeat` - all into the ring

**The template creates:**
```
Ring → DC → DC → DC → CH → CH (horizontal connection - WRONG)
```

**Should be:**
```
Ring → DC (all 12 dc into ring)
      ↘ DC
        ↘ DC... with CH-2 corners also worked after ring stitches
```

**Real-World Impact:** The 3D visualization will show an incorrect structure that doesn't match how an actual granny square is constructed.

---

### 1.3 HIGH: Foundation Row Working Direction is Backwards

**Location:** `src/core/Pattern.js:95, 549-550`

**Issue:** When starting with a chain, `workingDirection` is set to `'right'`, and on `startNewRow()`, it toggles. But in real crochet:
- You make your foundation chain left-to-right (if right-handed)
- Row 1: You turn and work RIGHT-TO-LEFT back across the chain
- Row 2: Turn and work LEFT-TO-RIGHT

The code has the initial direction as 'right', which means Row 1 would go right-to-left (correct), but this means the foundation chain was worked "right"... which is backwards from reality.

**Real-World Impact:** Pattern instructions and row direction indicators will be confusing to users who understand crochet construction.

---

### 1.4 HIGH: Spike Stitch Height is Wrong

**Location:** `src/core/StitchTypes.js:607-632`

**Issue:** Spike stitch is defined with `height: 2.0`, the same as a double crochet. But a spike stitch's height depends on how many rows down it goes! A spike worked 1 row below is approximately SC height at the top. A spike 2 rows below is taller, etc.

The `rowsBelow: 1` property exists but doesn't affect the height calculation.

**Real-World Impact:** 3D visualization will show spike stitches as uniformly tall regardless of their actual depth, creating an inaccurate fabric appearance.

---

### 1.5 HIGH: Shell Stitch has Wrong connectionsOut

**Location:** `src/core/StitchTypes.js:548-575`

**Issue:** Shell has `connectionsOut: 5`, meaning 5 stitches can be worked into it. But a shell is typically 5 DC worked into ONE stitch below - the shell itself is one logical unit that typically creates 5 tops to work into.

However, the shell is treated as a single node, not 5 separate DC nodes. This creates a mismatch: you can't actually work into each individual DC of the shell because they don't exist as separate nodes.

**Real-World Impact:** Users can't correctly construct shell-based patterns like the granny ripple where you work into specific stitches of a shell.

---

### 1.6 MEDIUM: V-Stitch Missing Chain Space

**Location:** `src/core/StitchTypes.js:577-605`

**Issue:** V-stitch is defined as "(dc, ch 1, dc) in same stitch" with `createsSpace: true`. But the implementation treats it as a single node. In reality, when working into a V-stitch on the next row, you'd typically work into the chain-1 space, not into the V-stitch "node" itself.

**Real-World Impact:** V-stitch patterns won't work correctly because the ch-1 space isn't a separate workable point.

---

### 1.7 MEDIUM: Cluster Stitch Works INTO Multiple, Not FROM One

**Location:** `src/core/StitchTypes.js:491-517`

**Issue:** Cluster has `connectionsIn: 3` suggesting it connects into 3 stitches below. This is correct for a 3-dc cluster worked across 3 stitches. BUT the `description` says "worked into consecutive stitches, joined at top" which is also a decrease-type stitch (dc3tog).

A "cluster" in crochet terminology usually means multiple partial DCs worked into the SAME stitch and joined at top (like a bobble but pulled flat). What's described here is actually "dc3tog" (double crochet 3 together).

**Real-World Impact:** Terminology confusion - crocheters looking for a cluster will get what's actually a dc3tog.

---

### 1.8 MEDIUM: Bobble/Popcorn Component Count Non-Standard

**Location:** `src/core/StitchTypes.js:407-462`

**Issue:** Both bobble and popcorn are defined with `componentStitches: 5`. While 5 is common, these stitches vary widely:
- Bobbles: commonly 3, 4, or 5 DCs
- Popcorns: commonly 4 or 5 DCs

The software provides no way to customize this.

**Real-World Impact:** Users following patterns that specify "3-dc bobble" or "4-dc popcorn" cannot accurately reproduce them.

---

### 1.9 MEDIUM: Circle Increases Assume Single Crochet

**Location:** `src/core/ShapingGuide.js:48-56`

**Issue:** The circle shaping instructions always say "sc" regardless of stitch type:
```javascript
instruction = `Work ${baseStitches} sc into magic ring`;
// ...
instruction = `*Sc ${scBetween}, inc* repeat around`;
```

If you're making a DC circle, the instructions are wrong.

**Real-World Impact:** Generated instructions are incorrect for non-SC circles.

---

### 1.10 LOW: Missing Common Stitch Types

**Location:** `src/core/StitchTypes.js`

**Missing stitches that crocheters commonly use:**
- Extended stitches (esc, ehdc, edc) - very common
- Linked stitches (linked dc, linked hdc)
- Bullion stitch
- Solomon's knot / Lover's knot
- Crossed stitches
- Cable stitches (not just post stitches)
- Star stitch / Marguerite stitch
- Crocodile stitch
- Basketweave (beyond just alternating FP/BP)

---

### 1.11 LOW: Picot Chain Count Not Configurable

**Location:** `src/core/StitchTypes.js:522-546`

**Issue:** Picot is hardcoded with `chainCount: 3`. Picots can be ch-2, ch-3, ch-4, or even ch-5 depending on pattern.

---

### 1.12 LOW: No Support for Working in Rows vs Rounds Hybrid

**Issue:** The pattern mode is either 'flat', 'round-joined', or 'round-spiral'. But many patterns (like amigurumi with flat pieces) combine both. There's no way to switch mid-pattern.

---

## Part 2: Software Bugs and Edge Cases

### 2.1 CRITICAL: Division by Zero in Circle Shaping

**Location:** `src/core/PatternTemplates.js:276`

**Issue:**
```javascript
const increaseEvery = increases > 0 ? Math.floor(prevStitches / increases) : Infinity;
```

If `increases` equals `prevStitches` (like in round 2 where you inc in every st), `increaseEvery` becomes 1. But on line 311:
```javascript
if (increasesAdded < increases && (i + 1) % increaseEvery === 0)
```

When `increaseEvery` is 1, `(i + 1) % 1 === 0` is ALWAYS true, causing an increase after every single stitch, which doubles the expected increase count.

**Test Case:** Create a circle with 6 starting stitches. Round 2 should have 12 stitches (6 + 6 inc). Bug may cause 18 stitches.

---

### 2.2 CRITICAL: Pattern.toJSON() Version Mismatch

**Location:** `src/core/Pattern.js:767` vs `src/utils/Constants.js:180`

**Issue:** Pattern exports with `version: 2` but `SchemaConstants.CURRENT_VERSION` is `1` and `SUPPORTED_VERSIONS: [1]`. This means patterns created and saved cannot be validated/loaded properly.

**Test Case:** Save a pattern, reload it - schema validation may fail.

---

### 2.3 HIGH: History State Race Condition

**Location:** `src/core/Pattern.js:655-683`

**Issue:** In `saveHistoryState()`:
```javascript
this.history.push({...});
this.historyIndex++;
if (this.history.length > this.maxHistorySize) {
    this.history.shift();
    this.historyIndex--;
}
```

If history is at max size and we add a new state, we push, increment index, then shift and decrement. This works, but there's no protection against concurrent calls. Rapid operations could corrupt history.

---

### 2.4 HIGH: getRowSorted Returns Reference, Not Copy

**Location:** Review `StitchGraph.js` implementation

**Issue:** If `getRowSorted()` returns the actual array (or a reference), callers that reverse it (like `Pattern.js:606`) modify the original:
```javascript
const prevRow = this.workingDirection === 'right'
    ? this.graph.getRowSorted(this.currentRow - 1)
    : this.graph.getRowSorted(this.currentRow - 1).reverse();
```

The `.reverse()` mutates in-place if the array isn't already a copy. This could corrupt the row index.

**Test Case:** Switch working direction mid-row multiple times, check if row order is corrupted.

---

### 2.5 HIGH: Attachment Point Logic Fails on Empty Row

**Location:** `src/core/Pattern.js:582-630`

**Issue:** `getAttachmentPoints()` checks `if (this.currentRow === 0)` but for a newly started pattern after foundation chain, `currentRow` is still 0. The function returns foundation endpoints, but if a user hasn't incremented the row, they can't attach to the middle of the foundation chain.

**Test Case:** Start a 20-chain foundation, try to attach a stitch to chain 10 without calling `startNewRow()` first.

---

### 2.6 MEDIUM: Turning Chain Position Calculation Ignores Working Direction

**Location:** `src/core/Pattern.js:243-256`

**Issue:** `calculateTurningChainPosition()` always positions chains at `prevNode.position.x` regardless of working direction. When working left-to-right, the turning chain should stack vertically at the LEFT end, not just at the previous node position.

**Test Case:** Create multiple rows, observe turning chain positions - they may stack incorrectly.

---

### 2.7 MEDIUM: Magic Ring connectionsOut Too High

**Location:** `src/core/StitchTypes.js:698`

**Issue:** Magic ring has `connectionsOut: 12` but the default magic ring only creates 6 stitches. This is fine for allowing more, but `hasAvailableConnectionsAbove` calculations may incorrectly show 12 attachment points when only 6 logical positions exist.

---

### 2.8 MEDIUM: PDF Export Content Overflow

**Location:** `src/utils/ExportManager.js:411-472`

**Issue:** `buildPDFTextContent()` keeps decrementing `yPos` but never checks if it goes below 0 (off page). Long patterns will have instructions running off the bottom of the PDF.

**Test Case:** Export a pattern with 50+ rows to PDF.

---

### 2.9 MEDIUM: Stitch Chart Symbol Collisions

**Location:** `src/utils/ExportManager.js:34-72`

**Issue:** Multiple stitch types map to the same symbol:
- `HALF_DOUBLE_CROCHET: 'T'` and `DOUBLE_CROCHET: 'T'`
- `TRIPLE_CROCHET: 'Y'` and `DOUBLE_TRIPLE_CROCHET: 'Y'`
- All decreases: `'A'`
- Both post DC types: `'T'`

**Real-World Impact:** Stitch charts are ambiguous and unusable for complex patterns.

---

### 2.10 MEDIUM: EventBus Memory Leak Potential

**Location:** `src/utils/EventBus.js`

**Issue:** If components subscribe with `on()` but never unsubscribe, listeners accumulate. The `on()` returns an unsubscribe function, but there's no enforcement or cleanup mechanism.

**Test Case:** Create/destroy patterns repeatedly, monitor listener count.

---

### 2.11 LOW: validatePattern() Doesn't Handle Missing Row 0

**Location:** `src/core/StitchValidator.js:204-207`

**Issue:** The loop starts at row 0 and assumes it exists. If `getRowCount()` returns a number but row 0 has no stitches (edge case), `getRowSorted(0)` returns empty, which is handled, but the validation logic may report false positives.

---

### 2.12 LOW: Keyboard Shortcut Conflicts

**Location:** `src/core/StitchTypes.js` - keyboard properties

**Issue:** Some keyboard shortcuts may conflict with browser/OS shortcuts:
- 'c' for Chain (Ctrl+C is copy)
- 'd' for Double Crochet (Ctrl+D is bookmark in some browsers)
- 's' for Single Crochet (Ctrl+S is save)

Without proper modifier key handling, these could cause unexpected behavior.

---

### 2.13 LOW: Node Position NaN Potential

**Location:** `src/core/Pattern.js:475-503`

**Issue:** `calculateRoundPosition()` uses:
```javascript
const angle = (stitchIndex / stitchCount) * Math.PI * 2;
```

If `stitchCount` is 0 (possible for empty rounds), this produces `NaN` or `Infinity` positions.

---

### 2.14 LOW: Missing Input Validation on Template Options

**Location:** `src/core/PatternTemplates.js`

**Issue:** Template functions accept options but don't validate them:
- `createGrannySquare({ rounds: -5 })` - negative rounds
- `createBasicCircle({ initialStitches: 0 })` - zero stitches
- `createTriangle({ baseWidth: 1000000 })` - enormous patterns

---

## Part 3: UX Issues for Crocheters

### 3.1 Row Numbering Confusion

**Issue:** Code uses 0-indexed rows internally but displays 1-indexed to users (e.g., `Row ${row + 1}`). This is fine, but the foundation chain is "row 0" internally, which means the first working row is row 1 in code but displayed as "Row 2" to users.

In crochet, the foundation chain is not typically counted as a row. Row 1 is the first row OF STITCHES worked into the chain.

---

### 3.2 Stitch Count Display Includes Turning Chains Inconsistently

**Location:** `src/core/Pattern.js:860-861`

The instruction generation sometimes includes turning chain in stitch count, sometimes doesn't. This inconsistency would confuse crocheters following the generated instructions.

---

### 3.3 No Yarn/Hook Size Information

**Issue:** Patterns have no way to store/display:
- Yarn weight (fingering, DK, worsted, etc.)
- Hook size (4mm, 5mm, etc.)
- Gauge (stitches/rows per inch/cm)

These are essential for any usable crochet pattern.

---

### 3.4 No Stitch Legend in PDF Export

**Issue:** The PDF export includes a stitch chart but no legend explaining what each symbol means. Crocheters unfamiliar with the specific symbols used can't read the chart.

---

## Summary of Findings

| Severity | Domain Issues | Software Bugs |
|----------|---------------|---------------|
| Critical | 2 | 2 |
| High | 3 | 4 |
| Medium | 5 | 5 |
| Low | 3 | 4 |
| **Total** | **13** | **15** |

## Recommended Priority Fixes

1. **Fix Pattern version mismatch** (2.2) - Patterns can't be saved/loaded correctly
2. **Fix circle increase calculation** (2.1) - Creates incorrect stitch counts
3. **Make HDC turning chain configurable** (1.1) - Core crochet accuracy
4. **Fix shell/V-stitch modeling** (1.5, 1.6) - Can't create shell patterns correctly
5. **Fix granny square template** (1.2) - Flagship template is structurally wrong
6. **Add PDF pagination** (2.8) - Long patterns are unusable
7. **Differentiate stitch chart symbols** (2.9) - Charts are ambiguous

---

*This review was conducted with the goal of making the software useful and accurate for real crocheters. The technical implementation is generally solid, but domain accuracy needs improvement for the tool to be genuinely useful for its intended purpose.*
