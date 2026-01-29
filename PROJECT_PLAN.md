# Crochet 3D Pattern Designer - Project Plan

## Vision
A 3D crochet pattern designer where users can dynamically build patterns by clicking nodes/edges to add verified stitch types. The system creates a realistic 3D model as rows build up, with physics simulation to show how stitches affect each other.

---

## Current State
- **Phase 1-5: COMPLETE** - Foundation, Rendering, Interaction, Physics, UI
- **Phase 6: COMPLETE** - Pattern Templates (granny square, circle, square, triangle) and Shaping Guides
- **Phase 7: COMPLETE** - Full import/export with JSON, PDF, and PNG support via ExportManager
- **Phase 8: NOT STARTED** - Advanced features (multi-color, collaboration, etc.)
- Full test coverage with 532 passing tests

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   UI Panel   │  │ Event System │  │   State Management   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        Core Systems                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Stitch Graph │  │Pattern Engine│  │   Physics Engine     │  │
│  │   (Nodes)    │  │  (Rows/Cols) │  │   (Constraints)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                       Rendering Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Three.js    │  │Stitch Meshes │  │   Interaction/       │  │
│  │   Scene      │  │  & Materials │  │   Raycasting         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation & Data Structures

### 1.1 Project Structure Reorganization
Create a modular file structure:
```
src/
├── core/
│   ├── StitchTypes.js      # Stitch definitions and properties
│   ├── StitchNode.js       # Individual stitch node class
│   ├── StitchGraph.js      # Graph structure for pattern
│   └── Pattern.js          # Pattern management (rows, sections)
├── rendering/
│   ├── SceneManager.js     # Three.js scene setup
│   ├── StitchRenderer.js   # Stitch mesh generation
│   ├── MaterialLibrary.js  # Yarn materials/colors
│   └── CameraController.js # Camera controls
├── physics/
│   ├── PhysicsEngine.js    # Physics simulation manager
│   ├── StitchConstraints.js# Stitch connection constraints
│   └── ForceSimulation.js  # Force-directed positioning
├── interaction/
│   ├── RaycastManager.js   # Click detection on stitches
│   ├── SelectionManager.js # Selected stitch handling
│   └── StitchPlacer.js     # New stitch placement logic
├── ui/
│   ├── UIManager.js        # UI panel management
│   ├── StitchPalette.js    # Stitch type selector
│   ├── PatternControls.js  # Row/pattern controls
│   └── Toolbar.js          # Main toolbar
├── utils/
│   ├── EventBus.js         # Event system
│   └── StateManager.js     # Application state
└── main.js                 # Entry point
```

### 1.2 Stitch Type Definitions
Define verified crochet stitch types with properties:

| Stitch | Abbreviation | Height | Width | Connections | Geometry Type |
|--------|--------------|--------|-------|-------------|---------------|
| Chain | ch | 1 | 1 | 1 in, 1 out | Small torus |
| Slip Stitch | sl st | 0.5 | 1 | 1 in, 1 out | Flat torus |
| Single Crochet | sc | 1 | 1 | 1 in, 1 out | Short cylinder loop |
| Half Double | hdc | 1.5 | 1 | 1 in, 1 out | Medium loop |
| Double Crochet | dc | 2 | 1 | 1 in, 1 out | Tall loop |
| Triple Crochet | tr | 3 | 1 | 1 in, 1 out | Very tall loop |
| Increase | inc | 1 | 2 | 1 in, 2 out | Branching |
| Decrease | dec | 1 | 0.5 | 2 in, 1 out | Merging |

### 1.3 Graph Data Structure
```javascript
// StitchNode properties
{
  id: string,
  type: StitchType,
  position: Vector3,
  row: number,
  column: number,
  connections: {
    below: StitchNode[],    // Stitches this hooks into
    above: StitchNode[],    // Stitches hooked into this
    left: StitchNode,       // Previous in row
    right: StitchNode       // Next in row
  },
  mesh: THREE.Mesh,
  physicsBody: PhysicsBody
}
```

**Deliverables:**
- [ ] Create src/ directory structure
- [ ] Implement StitchTypes.js with all stitch definitions
- [ ] Implement StitchNode.js class
- [ ] Implement StitchGraph.js with add/remove/connect methods
- [ ] Implement Pattern.js for row management
- [ ] Unit tests for data structures

---

## Phase 2: Rendering System

### 2.1 Stitch Geometry Generation
Create realistic 3D geometries for each stitch type:
- **Chain**: Small interlocking torus
- **Single Crochet**: V-shaped loop mesh
- **Double Crochet**: Taller post with wrapped yarn effect
- **Increases/Decreases**: Branching/merging geometry

### 2.2 Material System
- Yarn texture with fiber detail (normal maps)
- Color picker for yarn selection
- Multiple yarn weights (fingering, worsted, bulky)
- Realistic yarn shading (subsurface scattering approximation)

### 2.3 Scene Management
- Efficient instanced rendering for many stitches
- LOD (Level of Detail) for zoomed out views
- Grid/guide system for alignment
- Row highlighting

**Deliverables:**
- [ ] StitchRenderer.js with geometry for each stitch type
- [ ] MaterialLibrary.js with yarn materials
- [ ] SceneManager.js refactored from current main.js
- [ ] Instanced mesh support for performance
- [ ] Grid overlay system

---

## Phase 3: Interaction System

### 3.1 Click Detection (Raycasting)
- Click on existing stitch to select
- Click on "ghost" attachment points to add new stitch
- Hover highlighting
- Multi-select support (Shift+click)

### 3.2 Stitch Placement Logic
When adding a stitch:
1. Identify attachment point (which stitch, which connection)
2. Validate stitch type is valid for position
3. Calculate initial position
4. Create node and mesh
5. Add to graph
6. Trigger physics update

### 3.3 Selection & Editing
- Select stitch → show info panel
- Delete selected stitch (with undo)
- Change stitch type
- Drag to reposition (with constraints)

**Deliverables:**
- [ ] RaycastManager.js for click detection
- [ ] Hover/selection highlighting system
- [ ] Ghost attachment point visualization
- [ ] StitchPlacer.js with validation logic
- [ ] SelectionManager.js with multi-select
- [ ] Undo/redo system

---

## Phase 4: Physics Simulation

### 4.1 Constraint System
Model how stitches affect each other:
- **Horizontal connections**: Stitches in same row pull together
- **Vertical connections**: Stitches connect to row below
- **Tension**: Based on stitch type and yarn properties
- **Rest length**: Based on stitch dimensions

### 4.2 Force-Directed Layout
Use physics simulation to auto-position stitches:
- Spring forces for connections
- Repulsion to prevent overlap
- Gravity (optional, for drape simulation)
- Damping for stability

### 4.3 Real-time vs Settle
- Option for real-time physics (performance intensive)
- "Settle" button to run simulation until stable
- Visual feedback during simulation

**Deliverables:**
- [ ] PhysicsEngine.js core simulation loop
- [ ] StitchConstraints.js defining connection forces
- [ ] Verlet integration or spring physics implementation
- [ ] Performance optimization (spatial hashing, sleep states)
- [ ] "Drape" simulation mode for fabric behavior

---

## Phase 5: User Interface

### 5.1 Stitch Palette
- Visual icons for each stitch type
- Keyboard shortcuts (c=chain, s=single, d=double, etc.)
- Currently selected stitch highlighted
- Stitch info on hover

### 5.2 Pattern Controls
- Add row button
- Row navigation (go to row N)
- Pattern statistics (stitch count, dimensions)
- Stitch count per row display

### 5.3 Toolbar
- Undo/Redo buttons
- Zoom controls
- View modes (flat, 3D, schematic)
- Save/Load pattern

### 5.4 Info Panel
- Selected stitch details
- Edit stitch type
- Connection visualization
- Position in pattern (row, column)

**Deliverables:**
- [ ] HTML/CSS UI layout
- [ ] StitchPalette.js component
- [ ] PatternControls.js component
- [ ] Toolbar.js with all actions
- [ ] Info panel for selection
- [ ] Keyboard shortcut system

---

## Phase 6: Pattern Features

### 6.1 Row Management
- Start new row (turn or continuous)
- Working in the round (join to form circle)
- Flat vs circular patterns
- Increase/decrease tracking for shaping

### 6.2 Pattern Validation
- Validate stitch connections are valid
- Check for impossible constructions
- Warning for unusual patterns
- Stitch count consistency

### 6.3 Pattern Templates
- Start from foundation chain
- Start from magic ring
- Common shapes (square, circle, triangle)
- Preset patterns (granny square, etc.)

**Deliverables:**
- [x] Row direction tracking (left/right)
- [x] Working in the round support
- [x] Pattern validation engine
- [x] Template starter patterns (granny square, circle, square, triangle)
- [x] Shaping guides (increase/decrease suggestions)

---

## Phase 7: Import/Export

### 7.1 File Formats
- **Native format**: JSON pattern definition
- **PDF export**: Printable pattern with stitch diagram
- **Image export**: Screenshot of 3D view
- **Standard notation**: Written pattern instructions

### 7.2 Save/Load
- Local storage autosave
- File download/upload
- Pattern versioning

**Deliverables:**
- [x] JSON serialization/deserialization
- [x] LocalStorage autosave
- [x] File download (JSON, PDF, PNG) - via ExportManager
- [x] Written pattern generator
- [x] Pattern import from JSON
- [x] ExportManager module with full export functionality
- [x] Stitch chart generation with standard symbols
- [x] Export event system (EXPORT_STARTED, EXPORT_COMPLETED, EXPORT_ERROR)

---

## Phase 8: Advanced Features (Future)

### 8.1 Multi-Color Support
- Multiple yarn colors
- Color change at specific stitches
- Colorwork patterns (stripes, tapestry)

### 8.2 Advanced Physics
- Yarn weight simulation
- Blocking simulation (wet/steam)
- Gauge calculation

### 8.3 Collaboration
- Share patterns via URL
- Pattern library/gallery
- User accounts and saved patterns

### 8.4 Pattern Recognition
- Import from image
- Stitch detection from photo
- Pattern reconstruction

---

## Technical Considerations

### Performance
- Target: 1000+ stitches at 60fps
- Use InstancedMesh for repeated geometry
- Spatial partitioning for physics
- Web Workers for physics simulation
- Progressive loading for large patterns

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- WebGL 2.0 required
- Mobile-friendly (touch support) - Phase 2+

### Dependencies to Consider
- **cannon-es** or **rapier**: Physics engine options
- **dat.gui** or **lil-gui**: Debug controls
- **gsap**: Smooth animations
- **jspdf**: PDF export

---

## Recommended Implementation Order

```
Phase 1 (Foundation)     ████████████░░░░░░░░  2-3 weeks
Phase 2 (Rendering)      ████████░░░░░░░░░░░░  2 weeks
Phase 3 (Interaction)    ████████████░░░░░░░░  2-3 weeks
Phase 4 (Physics)        ████████████████░░░░  3-4 weeks
Phase 5 (UI)             ████████░░░░░░░░░░░░  2 weeks
Phase 6 (Patterns)       ████████████░░░░░░░░  2-3 weeks
Phase 7 (Import/Export)  ████░░░░░░░░░░░░░░░░  1 week
Phase 8 (Advanced)       Ongoing / Future
```

---

## Minimum Viable Product (MVP)

For a working MVP, complete:
1. **Phase 1**: Data structures
2. **Phase 2**: Basic rendering (chain, sc, dc)
3. **Phase 3**: Click to add stitches
4. **Phase 5**: Basic UI (stitch palette)
5. **Phase 7**: Save/load JSON

This gives you:
- Clickable 3D pattern builder
- 3 stitch types
- Visual feedback
- Save your work

---

## Getting Started - First Steps

1. Create `src/` directory structure
2. Move existing main.js logic to `src/rendering/SceneManager.js`
3. Implement `StitchTypes.js` with basic stitch definitions
4. Implement `StitchNode.js` and `StitchGraph.js`
5. Create basic raycasting for click detection
6. Add simple HTML UI for stitch selection
