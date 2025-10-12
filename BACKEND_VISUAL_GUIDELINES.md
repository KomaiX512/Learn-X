# Backend Visual Generation Guidelines

## Quick Reference for Generating Spatially-Organized Visuals

### Core Principle

**Every operation MUST include a `visualGroup` field** to organize content vertically on the canvas.

### Visual Group Structure

Organize each step into 3-5 independent visuals, each with:
1. **Heading** - What this visual shows
2. **Diagram** - The actual visual content
3. **Description** - Explanation of what it means

### Visual Group Naming

```
visualGroup="title"              → Step title (shown once at top)
visualGroup="heading-1"          → Heading for visual 1
visualGroup="diagram-1"          → Main diagram for visual 1
visualGroup="description-1"      → Text explanation for visual 1
visualGroup="annotation-1"       → Small labels/details for visual 1

visualGroup="heading-2"          → Heading for visual 2
visualGroup="diagram-2"          → Main diagram for visual 2
visualGroup="description-2"      → Text explanation for visual 2
visualGroup="annotation-2"       → Small labels/details for visual 2

... and so on
```

### Template Structure

```json
[
  {
    "op": "drawTitle",
    "text": "[Step Title]",
    "x": 0.5,
    "y": 0.5,
    "size": 36,
    "visualGroup": "title"
  },
  
  {
    "op": "drawLabel",
    "text": "Visual 1: [Concept Name]",
    "x": 0.1,
    "y": 0.2,
    "fontSize": 24,
    "visualGroup": "heading-1"
  },
  {
    "op": "customPath",
    "path": "[SVG PATH DATA]",
    "stroke": "#2196F3",
    "strokeWidth": 3,
    "visualGroup": "diagram-1"
  },
  {
    "op": "drawLabel",
    "text": "[Explanatory text about this visual]",
    "x": 0.1,
    "y": 0.8,
    "fontSize": 16,
    "visualGroup": "description-1"
  },
  {
    "op": "delay",
    "duration": 3000,
    "visualGroup": "diagram-1"
  },
  
  {
    "op": "drawLabel",
    "text": "Visual 2: [Next Concept]",
    "x": 0.1,
    "y": 0.2,
    "fontSize": 24,
    "visualGroup": "heading-2"
  },
  {
    "op": "customPath",
    "path": "[SVG PATH DATA]",
    "stroke": "#4CAF50",
    "strokeWidth": 3,
    "visualGroup": "diagram-2"
  },
  {
    "op": "drawLabel",
    "text": "[Explanatory text about second visual]",
    "x": 0.1,
    "y": 0.8,
    "fontSize": 16,
    "visualGroup": "description-2"
  },
  {
    "op": "delay",
    "duration": 3000,
    "visualGroup": "diagram-2"
  }
]
```

### Coordinate System

**IMPORTANT:** Use coordinates 0-1 within EACH visual group.

```
❌ WRONG - Don't stack Y coordinates manually:
{
  "op": "drawCircle",
  "x": 0.5,
  "y": 0.8,  // Trying to place it low
  "visualGroup": "diagram-1"
}
{
  "op": "drawCircle",
  "x": 0.5,
  "y": 1.8,  // ❌ Don't manually add to Y
  "visualGroup": "diagram-2"
}

✅ CORRECT - Use 0-1 in each group:
{
  "op": "drawCircle",
  "x": 0.5,
  "y": 0.5,  // Center of diagram-1 zone
  "visualGroup": "diagram-1"
}
{
  "op": "drawCircle",
  "x": 0.5,
  "y": 0.5,  // Center of diagram-2 zone
  "visualGroup": "diagram-2"
}

Frontend automatically places diagram-2 BELOW diagram-1!
```

### Real Example: DNA Replication

```json
[
  {
    "op": "drawTitle",
    "text": "DNA Replication Process",
    "x": 0.5,
    "y": 0.5,
    "visualGroup": "title"
  },
  
  {
    "op": "drawLabel",
    "text": "Visual 1: DNA Double Helix Structure",
    "x": 0.1,
    "y": 0.15,
    "fontSize": 24,
    "fontWeight": "bold",
    "visualGroup": "heading-1"
  },
  {
    "op": "customPath",
    "path": "M 0.3,0.2 Q 0.4,0.3 0.5,0.4 T 0.7,0.6 Q 0.8,0.7 0.9,0.8",
    "stroke": "#2196F3",
    "strokeWidth": 3,
    "visualGroup": "diagram-1"
  },
  {
    "op": "customPath",
    "path": "M 0.7,0.2 Q 0.6,0.3 0.5,0.4 T 0.3,0.6 Q 0.2,0.7 0.1,0.8",
    "stroke": "#4CAF50",
    "strokeWidth": 3,
    "visualGroup": "diagram-1"
  },
  {
    "op": "drawLabel",
    "text": "Complementary strands",
    "x": 0.5,
    "y": 0.3,
    "fontSize": 14,
    "visualGroup": "annotation-1"
  },
  {
    "op": "drawLabel",
    "text": "DNA consists of two complementary strands forming a double helix. Each strand serves as a template for replication.",
    "x": 0.1,
    "y": 0.85,
    "fontSize": 16,
    "visualGroup": "description-1"
  },
  {
    "op": "delay",
    "duration": 4000,
    "visualGroup": "diagram-1"
  },
  
  {
    "op": "drawLabel",
    "text": "Visual 2: Helicase Enzyme Unwinding",
    "x": 0.1,
    "y": 0.15,
    "fontSize": 24,
    "fontWeight": "bold",
    "visualGroup": "heading-2"
  },
  {
    "op": "drawCircle",
    "x": 0.5,
    "y": 0.4,
    "radius": 0.08,
    "color": "#FF5722",
    "fill": true,
    "visualGroup": "diagram-2"
  },
  {
    "op": "drawLabel",
    "text": "Helicase",
    "x": 0.55,
    "y": 0.38,
    "fontSize": 14,
    "visualGroup": "annotation-2"
  },
  {
    "op": "customPath",
    "path": "M 0.3,0.4 L 0.45,0.4",
    "stroke": "#2196F3",
    "strokeWidth": 3,
    "visualGroup": "diagram-2"
  },
  {
    "op": "customPath",
    "path": "M 0.55,0.4 L 0.7,0.4",
    "stroke": "#4CAF50",
    "strokeWidth": 3,
    "visualGroup": "diagram-2"
  },
  {
    "op": "drawLabel",
    "text": "Helicase enzyme unwinds the double helix by breaking hydrogen bonds between base pairs, creating a replication fork.",
    "x": 0.1,
    "y": 0.85,
    "fontSize": 16,
    "visualGroup": "description-2"
  },
  {
    "op": "delay",
    "duration": 4000,
    "visualGroup": "diagram-2"
  },
  
  {
    "op": "drawLabel",
    "text": "Visual 3: DNA Polymerase Synthesis",
    "x": 0.1,
    "y": 0.15,
    "fontSize": 24,
    "fontWeight": "bold",
    "visualGroup": "heading-3"
  },
  {
    "op": "particle",
    "x": 0.3,
    "y": 0.5,
    "count": 20,
    "color": "#FFC107",
    "speed": 0.02,
    "visualGroup": "diagram-3"
  },
  {
    "op": "drawLabel",
    "text": "Nucleotides",
    "x": 0.25,
    "y": 0.6,
    "fontSize": 14,
    "visualGroup": "annotation-3"
  },
  {
    "op": "drawLabel",
    "text": "DNA polymerase adds complementary nucleotides to form new strands. The process is semi-conservative.",
    "x": 0.1,
    "y": 0.85,
    "fontSize": 16,
    "visualGroup": "description-3"
  },
  {
    "op": "delay",
    "duration": 4000,
    "visualGroup": "diagram-3"
  }
]
```

### Best Practices

#### 1. Create 3-5 Visuals Per Step
```
✅ Good: 3-5 focused visuals
❌ Bad: 1 giant visual or 10+ tiny visuals
```

#### 2. Each Visual = One Concept
```
Visual 1: What is the structure?
Visual 2: How does it work?
Visual 3: What happens next?
Visual 4: What's the result?
```

#### 3. Always Include Description
```json
{
  "op": "drawLabel",
  "text": "This shows... Notice how... The key point is...",
  "visualGroup": "description-N"
}
```

#### 4. Use Delays Between Visuals
```json
{
  "op": "delay",
  "duration": 3000,
  "visualGroup": "diagram-N"
}
```
- 3000ms (3s) for simple visuals
- 4000ms (4s) for complex visuals
- 5000ms (5s) for very detailed visuals

#### 5. Color Coding
Use consistent colors across visual groups:
```json
// Visual 1 - Blue theme
{"stroke": "#2196F3", "visualGroup": "diagram-1"}

// Visual 2 - Green theme
{"stroke": "#4CAF50", "visualGroup": "diagram-2"}

// Visual 3 - Orange theme
{"stroke": "#FF5722", "visualGroup": "diagram-3"}
```

#### 6. Progressive Complexity
```
Visual 1: Simple overview
Visual 2: Add details
Visual 3: Show interactions
Visual 4: Complete picture
```

### Common Patterns

#### Pattern 1: Before/After Comparison
```json
[
  // Visual 1: Before
  {"text": "Before: Initial State", "visualGroup": "heading-1"},
  // ... diagram showing before
  
  // Visual 2: After
  {"text": "After: Final State", "visualGroup": "heading-2"}
  // ... diagram showing after
]
```

#### Pattern 2: Step-by-Step Process
```json
[
  {"text": "Step 1: Initialization", "visualGroup": "heading-1"},
  // ... diagram
  
  {"text": "Step 2: Processing", "visualGroup": "heading-2"},
  // ... diagram
  
  {"text": "Step 3: Completion", "visualGroup": "heading-3"}
  // ... diagram
]
```

#### Pattern 3: Zoom In
```json
[
  {"text": "Overview: Full System", "visualGroup": "heading-1"},
  // ... wide view
  
  {"text": "Detail: Core Component", "visualGroup": "heading-2"},
  // ... zoomed in
  
  {"text": "Molecular View", "visualGroup": "heading-3"}
  // ... zoomed further
]
```

### Visual Group Checklist

Before generating operations, ensure:
- [ ] Title operation with `visualGroup="title"`
- [ ] 3-5 visual groups (heading + diagram + description)
- [ ] Each group uses coordinates 0-1
- [ ] Delays between diagram groups
- [ ] Descriptions explain the visuals
- [ ] Consistent color scheme per visual
- [ ] Progressive complexity across visuals

### Testing Your Output

```bash
# Count visual groups (should be 3-5 per step)
grep -o '"visualGroup":"diagram-[0-9]"' output.json | wc -l

# Verify all operations have visualGroup
grep -c '"visualGroup"' output.json

# Check coordinate ranges (should be 0-1)
grep -o '"x":[0-9.]*' output.json | sort -u
```

### Migration from Old System

**Old way (overlapping chaos):**
```json
[
  {"op": "drawCircle", "x": 0.5, "y": 0.2},
  {"op": "drawCircle", "x": 0.5, "y": 0.5},
  {"op": "drawCircle", "x": 0.5, "y": 0.8}
]
// All render on top of each other!
```

**New way (clean vertical layout):**
```json
[
  {"op": "drawLabel", "text": "Visual 1", "visualGroup": "heading-1"},
  {"op": "drawCircle", "x": 0.5, "y": 0.5, "visualGroup": "diagram-1"},
  
  {"op": "drawLabel", "text": "Visual 2", "visualGroup": "heading-2"},
  {"op": "drawCircle", "x": 0.5, "y": 0.5, "visualGroup": "diagram-2"},
  
  {"op": "drawLabel", "text": "Visual 3", "visualGroup": "heading-3"},
  {"op": "drawCircle", "x": 0.5, "y": 0.5, "visualGroup": "diagram-3"}
]
// Each circle in its own vertical zone!
```

### Summary

**The Golden Rule:** 
> Every operation needs `visualGroup`, organize into 3-5 visuals per step, use coordinates 0-1 within each group.

**Result:**
- Clean vertical layout
- No overlapping
- Scrollable content
- Proper pacing
- Happy students!
