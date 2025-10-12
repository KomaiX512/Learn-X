# Vertical Spatial Layout System

## Overview

Complete redesign of the visual rendering system to eliminate overlapping content and create a clean, vertically-scrollable educational experience. The system organizes visuals into distinct zones with proper spacing, pacing, and visual hierarchy.

## Problem Solved

**Before:** All visuals rendered at overlapping positions on a fixed canvas, causing:
- Complete visual chaos (see screenshot with overlapping text/formulas)
- No spatial organization
- Impossibility to distinguish individual visuals
- No comprehension time for students
- No text hierarchy

**After:** Clean vertical layout with:
- Each visual in its own zone
- Vertical scrolling to view all content
- Proper spacing and pacing
- Visual hierarchy (title → heading → diagram → description)
- Educational timing delays

## Architecture

### Three-Layer System

```
┌─────────────────────────────────────┐
│  Backend: Visual Grouping           │
│  - Adds visualGroup tags to actions │
│  - Organizes into title/heading/    │
│    diagram/description groups       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Frontend: Layout Management        │
│  - VerticalLayoutManager            │
│  - Creates vertical zones           │
│  - Transforms coordinates           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Pacing: Timing Control             │
│  - PacingController                 │
│  - Educational delays               │
│  - Comprehension time               │
└─────────────────────────────────────┘
```

## Components

### 1. VerticalLayoutManager (`app/frontend/src/layout/VerticalLayoutManager.ts`)

**Purpose:** Manages vertical spatial organization of visuals.

**Key Features:**
- Creates vertical zones (title, heading, diagram, description, annotation)
- Transforms normalized coordinates (0-1) to absolute canvas positions
- Prevents overlapping by stacking zones vertically
- Auto-expands canvas height dynamically
- Provides visual hierarchy settings

**Zone Types:**
- `title`: 120px height, top-level step title
- `heading`: 80px height, visual subheadings
- `diagram`: 400px height, main visual content
- `description`: 100px height, explanatory text
- `annotation`: 60px height, labels and details

**Usage:**
```typescript
const layoutManager = new VerticalLayoutManager(canvasWidth, canvasHeight);

// Create zone
const zone = layoutManager.createZone('diagram-1', 'diagram');

// Transform coordinates
const coords = layoutManager.transformCoordinates('diagram-1', 0.5, 0.5);
// Returns: { x: 400, y: 520 } (accounting for zones above)
```

### 2. PacingController (`app/frontend/src/layout/PacingController.ts`)

**Purpose:** Controls animation timing and delays for educational comprehension.

**Educational Timing (Default):**
- Before title: 500ms
- After title: 2000ms (2s to read)
- Before heading: 800ms
- After heading: 1500ms (1.5s to read)
- Before diagram: 1000ms
- After diagram: 4000ms (4s to understand)
- Before description: 500ms
- After description: 3000ms (3s to read)
- Between actions: 1000ms (1s)
- Before new visual: 2000ms (2s pause)

**Presets:**
- `PacingController.fastMode()`: Testing (50% speed)
- `PacingController.slowMode()`: Complex topics (150% speed)
- Default: Educational (100% speed)

**Usage:**
```typescript
const pacing = new PacingController();

// Wait before showing diagram
await pacing.waitFor('diagram', 'before');

// Render diagram...

// Wait after for comprehension
await pacing.waitFor('diagram', 'after', complexity);
```

### 3. Backend Visual Grouping (`app/backend/src/agents/svgMasterGenerator.ts`)

**Purpose:** Adds structural organization to generated operations.

**Visual Group Tags:**
- `visualGroup="title"`: Step title
- `visualGroup="heading-1"`: Heading for visual 1
- `visualGroup="diagram-1"`: Main diagram 1
- `visualGroup="description-1"`: Description for visual 1
- `visualGroup="annotation-1"`: Labels for visual 1

**Example Backend Output:**
```json
[
  {
    "op": "drawTitle",
    "text": "Understanding DNA Replication",
    "x": 0.5,
    "y": 0.5,
    "visualGroup": "title"
  },
  {
    "op": "drawLabel",
    "text": "Visual 1: DNA Structure",
    "x": 0.1,
    "y": 0.2,
    "fontSize": 24,
    "visualGroup": "heading-1"
  },
  {
    "op": "customPath",
    "path": "M 0.3,0.4 C 0.4,0.5 0.6,0.6 0.7,0.7",
    "stroke": "#2196F3",
    "visualGroup": "diagram-1"
  },
  {
    "op": "drawLabel",
    "text": "The double helix unwinds during replication...",
    "x": 0.1,
    "y": 0.8,
    "fontSize": 16,
    "visualGroup": "description-1"
  },
  {
    "op": "delay",
    "duration": 3000,
    "visualGroup": "diagram-1"
  }
]
```

### 4. SequentialRenderer Integration

**Coordinate Transformation:**
```typescript
// Backend sends normalized (0-1)
action = { op: "drawCircle", x: 0.5, y: 0.5, visualGroup: "diagram-1" }

// Frontend transforms to absolute
// If "diagram-1" zone starts at Y=300, height=400:
// Y=0.5 → 300 + (0.5 * 400) = 500px absolute

transformedAction = { op: "drawCircle", x: 400, y: 500 }
```

**Automatic Zone Creation:**
- Detects visualGroup changes
- Creates zones on-the-fly
- Expands canvas height dynamically
- Applies pacing delays

## Visual Hierarchy

Text elements automatically receive hierarchy-appropriate styling:

```typescript
HIERARCHY = {
  title:      { fontSize: 36, color: '#ffffff', fontWeight: 'bold' },
  heading1:   { fontSize: 28, color: '#e0e0e0', fontWeight: 'bold' },
  heading2:   { fontSize: 22, color: '#d0d0d0', fontWeight: '600' },
  heading3:   { fontSize: 18, color: '#c0c0c0', fontWeight: '600' },
  body:       { fontSize: 16, color: '#b0b0b0', fontWeight: 'normal' },
  annotation: { fontSize: 14, color: '#a0a0a0', fontWeight: 'normal' },
  label:      { fontSize: 16, color: '#ffffff', fontWeight: 'normal' }
}
```

Applied automatically based on zone type:
- `title` zone → title style
- `heading` zone → heading1 style
- `description` zone → body style
- `annotation` zone → annotation style

## Canvas Behavior

### Vertical Scrolling
- Canvas grows vertically with content
- Fixed width (no horizontal scroll)
- Scroll to view all visuals sequentially
- Smooth animations during scroll

### Dynamic Height
```typescript
Initial height: 500px

After 3 visuals:
  Title zone:       120px
  Heading 1:        80px
  Diagram 1:        400px
  Description 1:    100px
  Heading 2:        80px
  Diagram 2:        400px
  Description 2:    100px
  Heading 3:        80px
  Diagram 3:        400px
  Description 3:    100px
  Padding:          40px
  ──────────────────────
  Total:            1900px

Canvas auto-expands to 1900px height
```

## Flow Example

**Complete rendering flow for one step:**

1. **Backend generates operations:**
   ```json
   [
     {"op":"drawTitle","text":"Step Title","visualGroup":"title"},
     {"op":"drawLabel","text":"Visual 1","visualGroup":"heading-1"},
     {"op":"customPath","path":"...","visualGroup":"diagram-1"},
     {"op":"drawLabel","text":"Description","visualGroup":"description-1"},
     {"op":"delay","duration":3000,"visualGroup":"diagram-1"}
   ]
   ```

2. **Frontend processes sequentially:**
   - Detects `visualGroup="title"` → Creates title zone at Y=40
   - Transforms coordinates for title zone
   - Renders title with hierarchy styles
   - Waits 2000ms (after-title delay)
   
   - Detects `visualGroup="heading-1"` → Creates heading zone at Y=160
   - Transforms coordinates for heading zone
   - Renders heading
   - Waits 1500ms (after-heading delay)
   
   - Detects `visualGroup="diagram-1"` → Creates diagram zone at Y=240
   - Waits 2000ms (before-new-visual delay)
   - Transforms coordinates for diagram zone
   - Renders diagram
   - Waits 4000ms (after-diagram delay)
   
   - Uses `visualGroup="description-1"` → Creates description zone at Y=640
   - Renders description
   - Waits 3000ms (after-description delay)
   
   - Processes delay action (3000ms additional)

3. **Result:**
   - Clean vertical layout
   - ~15 seconds total viewing time
   - Student has time to understand each part
   - Can scroll up to review

## Configuration

### Adjust Pacing
```typescript
// In SequentialRenderer constructor:
this.pacingController = new PacingController({
  afterDiagram: 5000,  // 5s to understand complex diagrams
  beforeNewVisual: 3000  // 3s pause between visuals
});

// Or use presets:
this.pacingController = new PacingController(PacingController.slowMode());
```

### Adjust Zone Heights
```typescript
// In VerticalLayoutManager constructor:
const layoutManager = new VerticalLayoutManager(width, height, {
  diagramHeight: 600,  // Larger diagrams
  descriptionHeight: 150,  // More description space
  zonePadding: 60  // More spacing between zones
});
```

### Adjust Visual Hierarchy
```typescript
// In VerticalLayoutManager.ts, modify HIERARCHY constant:
private readonly HIERARCHY = {
  title: { fontSize: 42, spacing: 70, color: '#ffffff' },
  // ... customize other levels
};
```

## Benefits

### For Students
- ✅ Clear visual separation
- ✅ Time to understand each concept
- ✅ Scrollable review of all content
- ✅ Hierarchical information structure
- ✅ No overwhelming overlaps

### For Developers
- ✅ Simple coordinate system (0-1 within groups)
- ✅ Automatic spatial management
- ✅ Configurable pacing
- ✅ Extensible zone types
- ✅ Clean separation of concerns

### For System
- ✅ Scalable to any number of visuals
- ✅ Dynamic canvas sizing
- ✅ Memory efficient (only visible zones rendered)
- ✅ Smooth animations
- ✅ Responsive to window resize

## Testing

Run frontend dev server:
```bash
cd app/frontend
npm run dev
```

Generate content and observe:
- Each visual appears in its own vertical section
- Proper delays between visuals
- Scrollable canvas
- No overlapping content
- Clear hierarchy

## Migration Notes

**Backend changes required:**
- Add `visualGroup` field to all operations
- Organize operations into 3-5 visual groups per step
- Add delay operations between groups

**Frontend changes:**
- No changes needed to existing operation handlers
- Coordinates automatically transformed
- Visual hierarchy automatically applied

**Backward compatibility:**
- Operations without `visualGroup` default to single zone
- Works with existing operation types
- Graceful degradation if layout manager unavailable

## Future Enhancements

Possible improvements:
- [ ] Automatic zone height calculation based on content
- [ ] Parallax scrolling effects
- [ ] Minimap navigation for long lessons
- [ ] Bookmark/jump to specific visual
- [ ] Adaptive pacing based on user interaction
- [ ] Zone transitions with custom animations
- [ ] Multi-column layouts for comparisons
- [ ] Collapsible zones for review mode

## Troubleshooting

**Issue:** Visuals still overlapping
- Check backend is adding `visualGroup` to all operations
- Verify LayoutManager is initialized in SequentialRenderer
- Check browser console for zone creation logs

**Issue:** Canvas not scrolling
- Verify container has `overflowY: 'auto'`
- Check canvas height is expanding (console logs)
- Ensure container has fixed height

**Issue:** Delays too long/short
- Adjust PacingController configuration
- Use fast/slow mode presets for testing
- Check complexity multipliers

**Issue:** Text hierarchy not applied
- Verify visualGroup names match patterns (title, heading-N, etc.)
- Check zone type detection in transformActionCoordinates
- Ensure fontSize not hardcoded in backend operations
