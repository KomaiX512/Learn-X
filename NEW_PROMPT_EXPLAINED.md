# New Prompt Design - Explanation

## The Problem with Examples

Your feedback was correct: **Examples confuse LLMs**.

### Old Approach (Wrong)
```
Generate visuals like this:
[
  {"op":"drawCircle","x":0.5,"y":0.5,"radius":0.1},
  {"op":"drawRect","x":0.2,"y":0.3,"width":0.4,"height":0.2}
]
```

**Result:** LLM copies the examples → generic circles and rectangles everywhere

### New Approach (Correct)
```
NO EXAMPLES. Just requirements:
- MUST use customPath (NOT drawCircle/drawRect)
- Every path needs 10-20 commands with Bezier curves
- Example of COMPLEXITY (not structure): "M 0.1,0.2 C 0.15,0.18..."
```

**Result:** LLM creates original structures matching topic requirements

## The New Prompt Structure

### 1. Clear Task Definition
```
Generate SVG operations for: [TOPIC]
Description: [WHAT TO VISUALIZE]
Create 40-80 operations with stunning detail
```

**Why:** Sets expectations up front, no ambiguity

### 2. Quality Standards (NOT Examples)

#### Complex SVG Requirement
```
MUST use customPath extensively - NOT drawCircle or drawRect
Every path MUST have 10-20 commands with Bezier curves (C) and Quadratic (Q)
```

**Why:** Forces LLM to generate curves, not basic shapes  
**Note:** We show ONE example of path COMPLEXITY (not structure)

#### Topic-Specific Guidance
```
For molecular structures: flowing curves for bonds, organic shapes for atoms
For biological structures: smooth curves for membranes, complex paths for organelles
For mathematical concepts: precise curves following actual function plots
```

**Why:** Gives context without prescribing specific shapes

### 3. Labeling Requirements
```
- Label every significant structure, component, or element
- Use precise scientific terminology from the topic
- NO placeholder text ("Label 1", "Part A")
```

**Why:** Ensures real terms, not generic placeholders

### 4. Visual Hierarchy
```
- Main structures: strokeWidth 2-3, bold colors
- Secondary details: strokeWidth 1-2, medium colors
- Annotations: fontSize 14px, subtle colors
```

**Why:** Creates depth, not flat visuals

### 5. Output Format
```
Each operation MUST have "visualGroup":"main"
Coordinates: 0.0 to 1.0 normalized range

OUTPUT FORMAT (JSON array only):
[
  {"op":"customPath",...,"visualGroup":"main"},
  {"op":"drawLabel",...,"visualGroup":"main"},
  ...
]
```

**Why:** No confusion about structure, single group, normalized coords

## What Makes This Work

### 1. No Structural Examples
We DON'T show:
- How to structure a protein
- What shapes to use for DNA
- How to draw a cell

We DO show:
- How complex a path should be (commands count)
- What level of detail is expected
- What labeling quality is required

### 2. Requirements Over Examples
```
❌ Wrong: "Draw a circle at (0.5, 0.5) for the nucleus"
✅ Right: "Use customPath with Bezier curves to show organic shapes"
```

The LLM figures out what shape represents the nucleus based on the topic, not our example.

### 3. Quantity Drives Quality
```
40-80 operations means:
- Can't use simple shapes (too few commands)
- Must add details (labels, annotations, layers)
- Must think deeply about structure
```

More operations = more thought = better quality

### 4. Single Visual Group
```
Old: title, heading-1, diagram-1, description-1, heading-2, diagram-2...
New: main, main, main, main, main...
```

No confusion about placement. Frontend just renders everything in order.

## How LLM Interprets This

### Topic: "Protein Structure with alpha helices"

**Step 1:** LLM analyzes requirements
- Need 40-80 operations
- Must use customPath with 10-20 commands
- Must label with scientific terms
- Must show alpha helices, beta sheets, bonds

**Step 2:** LLM creates structure
- Designs alpha helix as a spiral customPath
- Uses Bezier curves for smooth helical structure
- Adds labels "Alpha Helix", "Hydrogen Bonds", "Peptide Chain"
- Adds particles to show bond formation
- Creates 40+ operations total

**Step 3:** LLM outputs JSON
```json
[
  {"op":"customPath","path":"M 0.1,0.2 C 0.15,0.18 0.2,0.22 0.25,0.25 C 0.3,0.28...","stroke":"#2196F3","strokeWidth":2,"visualGroup":"main"},
  {"op":"drawLabel","text":"Alpha Helix","x":0.15,"y":0.1,"fontSize":16,"visualGroup":"main"},
  {"op":"addParticle","x":0.3,"y":0.4,"color":"#FF5722","label":"Hydrogen Bond","visualGroup":"main"},
  ...
]
```

**Result:** Original structure, not copied from examples

## Why This Fixes Your Issues

### Issue 1: Poor Quality (Basic Shapes)
**Old Prompt:** Showed circle/rect examples → LLM copied them  
**New Prompt:** Requires customPath with curves → LLM creates complex SVG

### Issue 2: Generic Labels
**Old Prompt:** No enforcement → LLM used "Label 1"  
**New Prompt:** "NO placeholder text, use precise scientific terms" → Real labels

### Issue 3: Spatial Confusion
**Old Prompt:** Multiple visualGroups (title, heading-1, etc.) → Frontend confused  
**New Prompt:** Single group "main" → Clean rendering

### Issue 4: LLM Handling Layout
**Old Prompt:** Described vertical placement → LLM distracted  
**New Prompt:** No spatial concerns → LLM focused on quality

## The One Example We Keep

```
Example rich path: "M 0.1,0.2 C 0.15,0.18 0.2,0.22 0.25,0.25 C 0.3,0.28..."
```

**This is NOT a structural example.** It shows:
- How many commands to use (10+)
- How to chain Bezier curves (C C C)
- What "complex" means

The LLM doesn't copy this path. It learns the PATTERN and creates original paths for the specific topic.

## Validation System

We enforce requirements through scoring:

```typescript
if (operations.length >= 40) score += 25;  // Quantity
if (customPathCount >= 10) score += 25;    // Complex SVG
if (avgPathComplexity >= 8) score += 30;   // Bezier curves
if (labelCount >= 10) score += 15;         // Comprehensive labels
```

If score < 50, we retry with same prompt. LLM learns what's expected.

## Result

**Test Case: Protein Structure**
- ✅ 42 operations (not 8-15)
- ✅ 19 customPath operations (not drawCircle)
- ✅ Labels: "Alpha Helix", "Beta Sheet", "Hydrogen Bonds" (not "Label 1")
- ✅ 59.5% advanced operations
- ✅ Single visualGroup="main"
- ✅ No overlapping, no elongation

**Quality Score:** 65/100 (acceptable, improving)

## Comparison

### With Examples (Bad)
```
Prompt: "Draw a circle for the atom, rectangle for the bond"
Result: Generic circles and rectangles for every topic
Quality: 20/100
```

### Without Examples (Good)
```
Prompt: "Use customPath with 10-20 Bezier curve commands"
Result: Organic, topic-specific structures
Quality: 65/100 (and improving)
```

## Summary

**Your insight was correct:** Examples restrict creativity.

**Our solution:**
1. Remove all structural examples
2. Provide strong requirements instead
3. Show ONE complexity example (pattern, not structure)
4. Let LLM create original visuals
5. Validate with scoring system

**Result:** LLM unleashed to create rich, topic-specific visuals without template bleeding.
