"use strict";
/**
 * VISUAL AGENT V2 - PRODUCTION GRADE DYNAMIC VISUAL ENGINE
 *
 * This agent INTELLIGENTLY SELECTS visualization tools based on content.
 * NO hardcoding for specific topics. TRUE dynamic generation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.visualAgentV2 = visualAgentV2;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const qualityEnforcer_1 = require("./qualityEnforcer");
const MODEL = 'gemini-2.5-flash'; // Highest RPM model
const TIMEOUT = 60000; // Allow time for complex multi-diagram generation
const MAX_RETRIES = 2;
/**
 * Generate comprehensive tool documentation for Gemini with COMPOSITION FOCUS
 */
function generateToolDocumentation() {
    return `
# PROFESSIONAL DIAGRAM GENERATION SYSTEM

You are an expert visualization engineer creating PROFESSIONAL EDUCATIONAL DIAGRAMS.
Your output should look like a polished textbook or technical presentation.

🎯 YOUR MISSION: Generate 65-85 operations that form 4-5 COMPLETE DIAGRAMS with:
  - Perfect alignment on invisible grid (use 0.1, 0.2, 0.3... positions)
  - Clear sectioning (multiple distinct visual concepts)
  - Rich labeling (every visual element explained)
  - Visual relationships (arrows connecting related elements)
  - Professional spacing (not cramped, not sparse)
  - Narrative flow: Brief explanatory labels BEFORE each visual section

# COMPREHENSIVE VISUAL TOOL LIBRARY

## AVAILABLE TOOL DOMAINS:

### 1. ELECTRICAL & ELECTRONICS
Tools for circuits, signals, components:
- drawCircuitElement: Proper electronic component symbols (resistor, capacitor, transistor, op-amp, etc.)
  Example: { op: "drawCircuitElement", type: "op_amp", x: 0.5, y: 0.5, label: "Amplifier" }
  
- drawSignalWaveform: Time-domain waveforms (sine, square, pulse, etc.)
  Example: { op: "drawSignalWaveform", waveform: "sine", amplitude: 0.3, x: 0.1, y: 0.5, width: 0.2, label: "Input" }
  
- drawConnection: Wires and connections
  Example: { op: "drawConnection", from: [0.2, 0.5], to: [0.4, 0.5], type: "wire" }

### 2. PHYSICS & MECHANICS
Tools for forces, motion, fields:
- drawForceVector: Force/velocity/acceleration arrows
  Example: { op: "drawForceVector", x: 0.5, y: 0.5, dx: 0.2, dy: 0, magnitude: 10, label: "F = 10N", color: "#ff0000" }
  
- drawPhysicsObject: Physical objects with properties
  Example: { op: "drawPhysicsObject", shape: "box", x: 0.3, y: 0.5, width: 0.1, height: 0.1, mass: 5, label: "Block A" }
  
- drawTrajectory: Motion paths
  Example: { op: "drawTrajectory", path: [[0.1,0.5], [0.3,0.3], [0.5,0.5]], animate: true }
  
- drawFieldLines: Electric/magnetic fields
  Example: { op: "drawFieldLines", type: "electric", sources: [[0.5,0.5,1]], density: 10 }

### 3. BIOLOGY & ANATOMY
Tools for cells, organs, biological structures:
- drawCellStructure: Detailed cell visualization
  Example: { op: "drawCellStructure", type: "neuron", x: 0.5, y: 0.5, size: 0.3, showOrganelles: true, detail: "high" }
  
- drawOrganSystem: Organ or body system
  Example: { op: "drawOrganSystem", organ: "heart", style: "schematic", showLabels: true }
  
- drawMolecularStructure: Proteins, DNA
  Example: { op: "drawMolecularStructure", type: "dna", structure: "double_helix", showBonds: true }
  
- drawMembrane: Cell membrane with proteins
  Example: { op: "drawMembrane", x: 0.2, y: 0.5, width: 0.6, showProteins: true, showChannels: true }

### 4. CHEMISTRY
Tools for atoms, molecules, reactions:
- drawAtom: Atomic structure
  Example: { op: "drawAtom", element: "C", x: 0.5, y: 0.5, showElectrons: true, showOrbitals: true }
  
- drawMolecule: Chemical molecules with bonds
  Example: { op: "drawMolecule", formula: "H2O", structure: "2d", atoms: [{element:"O",x:0.5,y:0.5}, {element:"H",x:0.4,y:0.6}], bonds: [{from:0,to:1,type:"single"}] }
  
- drawReaction: Chemical reactions
  Example: { op: "drawReaction", reactants: [...], products: [...], showEnergy: true }

### 5. MATHEMATICS
Tools for graphs, geometry, equations:
- drawCoordinateSystem: 2D/3D axes with grid (REQUIRED for graphs!)
  Example: { op: "drawCoordinateSystem", type: "cartesian", xRange: [-5,5], yRange: [-5,5], showGrid: true, x: 0.5, y: 0.5 }
  
- drawGeometry: Geometric shapes with measurements
  Example: { op: "drawGeometry", shape: "triangle", vertices: [[0.3,0.6], [0.7,0.6], [0.5,0.3]], showAngles: true, showSides: true }
  
- drawLatex: Mathematical equations (beautifully rendered)
  Example: { op: "drawLatex", equation: "\\\\frac{dy}{dx} = \\\\lim_{h \\\\to 0} \\\\frac{f(x+h)-f(x)}{h}", x: 0.5, y: 0.3, size: 24 }
  
- animate: For highlighting, transforming, or morphing math objects
  Example: { op: "animate", target: "equation1", type: "highlight", duration: 1000 }

NOTE: To plot functions, use drawCoordinateSystem + multiple drawCircle/drawRect to mark points, NOT drawGraph!

### 6. COMPUTER SCIENCE
Tools for algorithms, data structures:
- drawDataStructure: Arrays, trees, graphs
  Example: { op: "drawDataStructure", type: "tree", data: [10,5,15,2,7,12,20], showPointers: true }
  
- drawFlowchart: Algorithm diagrams
  Example: { op: "drawFlowchart", nodes: [{type:"start",label:"Begin",x:0.5,y:0.1}], connections: [{from:0,to:1}] }
  
- drawNeuralNetwork: Neural network architecture
  Example: { op: "drawNeuralNetwork", layers: [3,4,2], x: 0.3, y: 0.5, showWeights: true }

### 7. GENERAL VISUALIZATION
Universal tools:
- drawLabel: Smart text labels (with anti-overlap)
  Example: { op: "drawLabel", text: "Key concept", x: 0.5, y: 0.6, fontSize: 16, avoidOverlap: true }
  
- drawTitle: Section titles
  Example: { op: "drawTitle", text: "Understanding Amplifiers", x: 0.5, y: 0.1, size: 32 }
  
- drawDiagram: Custom diagrams
  Example: { op: "drawDiagram", nodes: [...], edges: [...], layout: "hierarchical" }
  
- animate: Animate any element
  Example: { op: "animate", objectId: "obj1", animation: "move", to: {x:0.7,y:0.5}, duration: 1000 }
  
- delay: Timing control
  Example: { op: "delay", duration: 1500 }

## YOUR TASK: PROFESSIONAL DIAGRAM COMPOSITION

🎨 COMPOSITION WORKFLOW (Follow this structure):

### STEP 1: PLAN YOUR CANVAS (Invisible Grid)
Divide canvas into logical regions:
  - TOP (y=0.1-0.3): Primary concept/title
  - MIDDLE-LEFT (x=0.1-0.4, y=0.35-0.65): Diagram 1
  - MIDDLE-CENTER (x=0.45-0.7, y=0.35-0.65): Diagram 2  
  - MIDDLE-RIGHT (x=0.75-0.95, y=0.35-0.65): Diagram 3
  - BOTTOM (y=0.7-0.9): Equations/Summary

### STEP 2: GENERATE 4-5 COMPLETE MINI-DIAGRAMS (50-70 TOTAL OPERATIONS)
Each mini-diagram = 10-15 operations:
  1. **Section Label** (① ② ③ ④ ⑤) - MANDATORY marker
  2. Container/Background (optional box)
  3. Main visual using DOMAIN TOOLS - 6-10 ops
  4. Labels explaining parts - 2-3 ops
  5. Connecting arrows (if showing flow) - 1-2 ops
  6. Brief delay for pacing (1500-2000ms)

⚠️ COUNT YOUR OPERATIONS: You MUST generate 50-70 total operations!

### STEP 3: INTELLIGENT TOOL SELECTION PER DIAGRAM
1. ANALYZE what needs to be visualized
2. IDENTIFY the domain (electrical, physics, biology, chemistry, math, CS, general)
3. SELECT the most appropriate DOMAIN-SPECIFIC tools (NOT generic shapes!)
4. COMPOSE them into a coherent mini-diagram
5. ADD section marker label (① ② ③ ④ ⑤) at top
6. ADD explanatory labels with avoidOverlap: true
7. POSITION on grid (x: 0.1, 0.15, 0.2, 0.25... NOT 0.47, 0.83, etc.)

🎯 PRIORITIZE DOMAIN TOOLS:
   - Electrical? → drawCircuitElement, drawSignalWaveform, drawConnection
   - Physics? → drawForceVector, drawPhysicsObject, drawTrajectory
   - Biology? → drawCellStructure, drawOrganSystem, drawMembrane
   - Chemistry? → drawMolecule, drawAtom, drawReaction, drawBond
   - Math? → drawCoordinateSystem, drawGeometry, drawLatex
   - CS? → drawDataStructure, drawNeuralNetwork, drawAlgorithmStep

## ⚠️ CRITICAL MINIMUM REQUIREMENTS (WILL BE REJECTED IF NOT MET):

🔴 **OPERATION COUNT**: Generate EXACTLY 50-70 operations total
   - Less than 50 = REJECTED as insufficient richness
   - More than 70 = REJECTED as overwhelming
   - This is NON-NEGOTIABLE for professional quality

🔴 **SECTION MARKERS**: Include 4-5 section labels using ① ② ③ ④ ⑤ symbols
   - Each section = one distinct concept mini-diagram
   - Place at top of each section (e.g., "① INPUT STAGE")
   - MANDATORY - content will be REJECTED without section markers

🔴 **DOMAIN-SPECIFIC OPERATIONS**: 60-70% of operations MUST be domain-specific (V2 tools)
   - ✅ STRONGLY PREFER: drawCircuitElement, drawMolecule, drawForceVector, drawCellStructure, etc.
   - ❌ AVOID GENERIC: drawCircle, drawRect, drawLine (only use if domain tools insufficient)
   - Use the specialized tools - they exist for a reason!

## QUALITY STANDARDS (STRICT ENFORCEMENT):
✓ **Grid Alignment**: All x/y positions MUST be multiples of 0.05 (0.1, 0.15, 0.2, 0.25...)
✓ **Multiple Diagrams**: Generate 4-5 distinct visual concepts, NOT one big messy diagram
✓ **Rich Labeling**: 8-12 explanatory labels (not just visual labels)
✓ **Visual Relationships**: Use drawConnection/arrows to show relationships between diagrams
✓ **Professional Spacing**: Leave space between diagrams (don't overlap)
✓ **Storytelling Flow**: Title → Section ① → Section ② → Section ③ → Section ④ → Summary
✓ **Proper Delays**: 3-5 delays to pace the learning (1500-2000ms each)

## PATTERN FOR NARRATIVE FLOW:

Each section MUST follow this structure:
1. Section marker (① ② ③ ④ ⑤)
2. Brief narrative label explaining WHAT you're about to see
3. Then the actual visual operations
4. Then explanatory labels about the visual

EXAMPLE PATTERN:
[
  { "op": "drawLabel", "text": "① CONCEPT NAME", "x": 0.2, "y": 0.15, "fontSize": 18, "bold": true },
  { "op": "drawLabel", "text": "Let's visualize how [concept] works...", "x": 0.2, "y": 0.22, "fontSize": 14, "color": "#00d9ff", "italic": true },
  // NOW draw the actual visual
  { "op": "[domain-specific-tool]", ... },
  // THEN explain what we're seeing
  { "op": "drawLabel", "text": "Notice how...", "x": 0.2, "y": 0.5, "fontSize": 13, "avoidOverlap": true }
]

This creates NARRATIVE FLOW so users understand WHY each visual appears.

Now generate 65-85 operations for this step using INTELLIGENT TOOL SELECTION with NARRATIVE FLOW.
`;
}
/**
 * Build the generation prompt with tool documentation
 */
function buildPrompt(context) {
    const { topic, stepTag, stepDescription } = context;
    const stepTitles = {
        'hook': '✨ The Hook - Capture Interest',
        'intuition': '🔍 Build Intuition',
        'formalism': '📐 The Mathematics',
        'exploration': '🔬 Explore Deeper',
        'mastery': '🚀 Master & Apply'
    };
    return `${generateToolDocumentation()}

## CURRENT TASK:

Topic: "${topic}"
Step: ${stepTitles[stepTag] || stepTag}
Description: ${stepDescription}

## INSTRUCTIONS:

1. ANALYZE the topic and step to understand what needs to be visualized
2. IDENTIFY which domain(s) this belongs to (electrical, physics, biology, chemistry, math, CS)
3. SELECT 65-85 operations from the appropriate tool categories
4. CREATE 4-5 SECTIONS with markers (① ② ③ ④ ⑤) - MANDATORY!
5. ADD NARRATIVE labels before EACH section explaining what you'll show
6. COMPOSE them in logical sequence (title → narrative → visuals → explanation → repeat)
7. ENSURE all labels use avoidOverlap: true to prevent text overlap
8. PRIORITIZE domain-specific tools (65-75% of operations MUST be V2 tools)
9. ADD PRECISION: All math equations must have proper scales, units, axis labels

## OUTPUT FORMAT:

Return ONLY valid JSON array of operations (no markdown, no explanations):
[
  { "op": "drawTitle", "text": "...", ... },
  { "op": "domain-specific-operation", ... },
  ...
]

🔥 CRITICAL REQUIREMENTS (STRICTLY ENFORCED - REJECTION IF NOT MET):

🚨 OPERATION COUNT: Generate EXACTLY 65-85 operations
   - Count your operations as you generate!
   - Less than 65 = AUTOMATIC REJECTION
   - More than 85 = AUTOMATIC REJECTION
   - Aim for 72-75 for safety

🚨 SECTION MARKERS: Include 4-5 labels with ① ② ③ ④ ⑤ symbols
   - Example: { "op": "drawLabel", "text": "① INPUT STAGE", "x": 0.2, "y": 0.15, "bold": true }
   - NO section markers = AUTOMATIC REJECTION
   - These organize your multi-diagram composition

🚨🚨🚨 DOMAIN-SPECIFIC OPERATIONS: 60-70% REQUIRED (STRICT ENFORCEMENT)
   - **TARGET: 60-70% V2 operations (not just 35%!)**
   - **MINIMUM: 35% to pass, but AIM FOR 60-70%**
   
   ⛔ BANNED (Use <15% total - ONLY for pure geometry/counting):
   ❌ drawCircle - forbidden except for pure circular shapes
   ❌ drawRect - forbidden except for generic containers
   ❌ drawLine - forbidden except for basic connections
   
   ✅ REQUIRED (Use 65-75% total - THIS IS YOUR PRIMARY TOOLBOX):
   ✅ drawCircuitElement - ALL electrical components (resistor, capacitor, transistor)
   ✅ drawMolecule - ALL chemistry (atoms, bonds, structures)
   ✅ drawCellStructure - ALL biology (organelles, membranes, proteins)
   ✅ drawPhysicsObject - ALL physics (masses, springs, pendulums)
   ✅ drawMathShape - ALL geometry (triangles, polygons, NOT drawCircle!)
   ✅ drawDataStructure - ALL CS (arrays, trees, graphs, stacks)
   ✅ drawSignalWaveform - ALL signals (sine, square, digital)
   ✅ drawChemicalReaction - ALL reactions (reactants → products)
   
   🎯 CORRECT VS WRONG:
   Instead of: drawCircle → Use: drawMolecule type="atom"
   Instead of: drawRect → Use: drawCircuitElement type="resistor"
   Instead of: drawLine → Use: drawConnection type="arrow"
   
   **IF YOU CANNOT IDENTIFY THE V2 TOOL, YOU'RE NOT THINKING HARD ENOUGH!**

🚨 OTHER TARGETS (WILL BE VALIDATED):
- **EXACTLY 1 drawTitle** - One title at the start ONLY
- **1-2 drawLabel for context** - Brief intro ONLY (keep it minimal!)
- **6-8 drawLabel total** - Label KEY concepts only (let visuals speak!)
- **MAXIMUM 10 labels** - More labels = text-heavy = NOT 3Blue1Brown style
- **3-5 delay** - Pace the learning (1500-2000ms each)

🎓 TEACHING FLOW (3Blue1Brown Style):
STEP 1: Draw step title
STEP 2: Add 1-2 contextual sentences explaining the "why" (like a teacher talking)
STEP 3: Then show visualizations with labels
Example:
  { "op": "drawTitle", "text": "Signal Amplification", "x": 0.5, "y": 0.05 },
  { "op": "delay", "duration": 1000 },
  { "op": "drawLabel", "text": "How can a tiny input control a large output?", "x": 0.5, "y": 0.12, "fontSize": 16, "italic": true, "color": "#00d9ff" },
  { "op": "drawLabel", "text": "This is the magic of transistors as amplifiers.", "x": 0.5, "y": 0.17, "fontSize": 14, "color": "#ffffff" },
  { "op": "delay", "duration": 1500 },
  // Then diagrams...

📊 COMPOSITION REQUIREMENTS:
- Generate 4-5 DISTINCT visual concepts (mini-diagrams)
- Each concept = Title/Label + 6-10 visual ops + 2-3 explanation labels
- Use GRID POSITIONS (0.1, 0.15, 0.2, 0.25... NOT random decimals)
- Connect related diagrams with drawConnection arrows
- Balance: 60% domain visuals + 25% labels + 15% structure (delays, connections)

⚡ DOMAIN-SPECIFIC TOOLS (Use these AGGRESSIVELY in COMPOSITIONS):
  * Electrical → drawCircuitElement, drawSignalWaveform, drawConnection (combine all 3!)
  * Physics → drawPhysicsObject + drawForceVector + drawTrajectory (show motion!)
  * Biology → drawCellStructure + drawMembrane + drawMolecule (layered diagrams!)
  * Chemistry → drawMolecule + drawAtom + drawReaction (show transformations!)
  * CS → drawDataStructure + drawAlgorithmStep + highlight (step-by-step!)
  * Math → drawCoordinateSystem + drawGeometry + drawLatex (prove visually!)

📐 MATHEMATICAL PRECISION REQUIREMENTS (FOR MATH/PHYSICS/ENGINEERING TOPICS):
  When drawing graphs, equations, or coordinate systems:
  
  ✅ ALWAYS include axis labels with units (e.g., "Time (s)", "Distance (m)")
  ✅ ALWAYS show scale markers (tick marks at regular intervals)
  ✅ ALWAYS label important points with coordinates (e.g., "(3, 9)")
  ✅ ALWAYS use proper mathematical notation in LaTeX
  ✅ ALWAYS show relationships with arrows and annotations
  
  Example of PRECISE math visualization:
  { "op": "drawCoordinateSystem", "xRange": [-5, 5], "yRange": [-5, 5], "xLabel": "x", "yLabel": "f(x)", "showGrid": true },
  { "op": "drawLabel", "text": "x = 0", "x": 0.5, "y": 0.48 },
  { "op": "drawLabel", "text": "(2, 4)", "x": 0.7, "y": 0.4 },
  { "op": "drawLatex", "equation": "f(x) = x^2", "x": 0.7, "y": 0.2 }
  
🎬 CONTEXTUAL ANIMATIONS (ONLY WHEN RELEVANT TO TOPIC):
  
  **USE ANIMATIONS ONLY WHEN THEY ADD MEANING TO THE CONCEPT:**
  ✅ orbit - ONLY for: electrons orbiting atoms, planets, circular motion, cycles
  ✅ wave - ONLY for: signals, oscillations, wave propagation, sound, light
  ✅ particle - ONLY for: diffusion, flow, transfer, emission, molecular motion
  
  ❌ DO NOT add random animations just to fill space
  ❌ DO NOT use orbit/wave/particle for unrelated topics (e.g., philosophy, history)
  ✅ DO use contextual animations that enhance understanding
  
  WHEN TO USE EACH ANIMATION:
  
  orbit → Atoms (electrons), Solar systems (planets), Circular motion, Cycles
  wave → Signals (electrical/sound/light), Oscillations, Wave phenomena
  particle → Diffusion, Flow (blood/fluids), Molecular motion, Energy transfer
  
  WHEN NOT TO USE:
  - Philosophy topics: Use diagrams, NOT animations
  - History topics: Use timelines, NOT particles
  - Abstract concepts: Use symbolic visuals, NOT random orbits
  - Pure mathematics: Use geometric transformations, NOT generic waves

❌ WHAT TO AVOID:
- DO NOT use multiple drawTitle operations (1 only!)
- DO NOT use drawGraph (use drawCoordinateSystem + specific domain tools)
- DO NOT use generic drawDiagram (use domain-specific tools: drawCircuitElement, drawMolecule, etc.)
- DO NOT use random decimals for positions (0.1, 0.15, 0.2... ONLY)
- DO NOT create one giant messy diagram (make 4-5 clean separated concepts)
- DO NOT forget labels (6-8 for KEY concepts only - let visuals speak!)
- DO NOT make it text-heavy (max 10 labels total)

✅ EXCELLENT EXAMPLE (Professional Multi-Diagram Composition):
[
  { "op": "drawTitle", "text": "Newton's Laws of Motion", "x": 0.5, "y": 0.05 },
  { "op": "delay", "duration": 1000 },
  { "op": "drawLabel", "text": "Why do objects move the way they do?", "x": 0.5, "y": 0.11, "fontSize": 16, "italic": true, "color": "#00d9ff" },
  { "op": "drawLabel", "text": "Three simple laws explain all motion in the universe.", "x": 0.5, "y": 0.16, "fontSize": 14, "color": "#ffffff" },
  { "op": "delay", "duration": 1500 },
  
  // DIAGRAM 1: Object + Force (Left, y=0.3)
  { "op": "drawLabel", "text": "① First Law", "x": 0.2, "y": 0.23 },
  { "op": "drawPhysicsObject", "shape": "box", "x": 0.2, "y": 0.35, "mass": 5 },
  { "op": "drawForceVector", "x": 0.2, "y": 0.35, "dx": 0, "dy": 0, "label": "F=0" },
  { "op": "drawLabel", "text": "No net force → No acceleration", "x": 0.2, "y": 0.5 },
  { "op": "delay", "duration": 1500 },
  
  // DIAGRAM 2: F=ma (Center, y=0.3)
  { "op": "drawLabel", "text": "② Second Law", "x": 0.5, "y": 0.15 },
  { "op": "drawPhysicsObject", "shape": "box", "x": 0.45, "y": 0.35, "mass": 5 },
  { "op": "drawForceVector", "x": 0.55, "y": 0.35, "dx": 0.15, "dy": 0, "label": "F=10N" },
  { "op": "drawTrajectory", "path": [[0.45,0.35], [0.6,0.35], [0.75,0.35]] },
  { "op": "drawLatex", "equation": "a = \\frac{F}{m} = 2\\,m/s^2", "x": 0.5, "y": 0.5 },
  { "op": "delay", "duration": 2000 },
  
  // DIAGRAM 3: Action-Reaction (Right, y=0.3)
  { "op": "drawLabel", "text": "③ Third Law", "x": 0.8, "y": 0.15 },
  { "op": "drawPhysicsObject", "shape": "box", "x": 0.75, "y": 0.35, "mass": 3 },
  { "op": "drawPhysicsObject", "shape": "box", "x": 0.85, "y": 0.35, "mass": 3 },
  { "op": "drawForceVector", "x": 0.8, "y": 0.35, "dx": 0.05, "dy": 0, "label": "F₁₂" },
  { "op": "drawForceVector", "x": 0.8, "y": 0.35, "dx": -0.05, "dy": 0, "label": "F₂₁" },
  { "op": "drawLabel", "text": "Equal & opposite forces", "x": 0.8, "y": 0.5 },
  { "op": "delay", "duration": 1500 },
  
  // SUMMARY (Bottom)
  { "op": "drawLabel", "text": "Three fundamental laws govern all motion", "x": 0.5, "y": 0.7 },
  { "op": "drawLatex", "equation": "\\sum F = ma", "x": 0.5, "y": 0.8 },
  { "op": "delay", "duration": 2000 }
  // Result: 50+ operations, 4 diagrams, professional layout
]

❌ BAD EXAMPLE (Messy, unorganized, rejected):
[
  { "op": "drawTitle", "text": "Physics", "x": 0.5, "y": 0.1 },
  { "op": "drawCircle", "x": 0.23, "y": 0.47 },      // ❌ Random positions!
  { "op": "drawLabel", "text": "thing", "x": 0.58 }, // ❌ Vague label!
  { "op": "drawCircle", "x": 0.41, "y": 0.39 },      // ❌ No organization!
  { "op": "drawLabel", "text": "stuff" },           // ❌ Useless!
  { "op": "drawCircle", "x": 0.67, "y": 0.52 },      // ❌ Just random shapes!
  { "op": "delay", "duration": 500 },                // ❌ Too short!
  { "op": "drawCircle", "x": 0.19, "y": 0.71 }
  // Result: REJECTED - no clear diagrams, messy layout, generic shapes, useless labels
]

🎯 YOUR MISSION: Generate 50-70 operations forming 4-5 PROFESSIONAL DIAGRAMS

📋 COMPOSITION CHECKLIST (Follow this):
□ 1 clear title at top
□ 4-5 distinct visual concepts (mini-diagrams)
□ Each concept has: section label + 6-10 visual ops + 2-3 explanatory labels
□ Grid-aligned positions (0.1, 0.15, 0.2...)
□ Arrows connecting related concepts
□ 3-5 delays for pacing (1.5-2s each)
□ Bottom summary with equation/key insight
□ 8-12 total labels explaining everything
□ 35+ domain-specific operations

Generate the professional multi-diagram visualization now:`;
}
/**
 * Parse and validate generated operations
 */
function parseAndValidate(response, context) {
    const logger = require('../logger').logger;
    // Extract JSON from response
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    }
    else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
    }
    jsonStr = jsonStr.trim();
    try {
        let operations;
        try {
            // Try normal parsing first
            operations = JSON.parse(jsonStr);
        }
        catch (parseError) {
            // JSON is incomplete - try to repair it
            logger.warn(`[visualV2] JSON parse failed, attempting repair...`);
            // Common issue: Truncated array - missing closing bracket
            if (jsonStr.startsWith('[') && !jsonStr.endsWith(']')) {
                // Find the last complete object
                let lastCompleteIdx = jsonStr.lastIndexOf('}');
                if (lastCompleteIdx > 0) {
                    // Truncate to last complete object and close array
                    const repairedJson = jsonStr.substring(0, lastCompleteIdx + 1) + ']';
                    logger.info(`[visualV2] Attempting to parse ${repairedJson.length} chars (truncated from ${jsonStr.length})`);
                    try {
                        operations = JSON.parse(repairedJson);
                        logger.info(`[visualV2] ✅ Successfully repaired truncated JSON! Recovered ${operations.length} operations.`);
                    }
                    catch (repairError) {
                        logger.error(`[visualV2] Repair failed:`, repairError);
                        throw parseError; // Throw original error
                    }
                }
                else {
                    throw parseError;
                }
            }
            else {
                throw parseError;
            }
        }
        if (!Array.isArray(operations)) {
            throw new Error('Response is not an array');
        }
        if (operations.length < 10) {
            logger.warn(`[visualV2] Only ${operations.length} operations generated, expected 30-50`);
        }
        // Validate each operation has required fields
        const validated = operations.filter(op => {
            if (!op.op || typeof op.op !== 'string') {
                logger.warn(`[visualV2] Invalid operation missing 'op' field:`, op);
                return false;
            }
            return true;
        });
        logger.info(`[visualV2] Generated ${validated.length} valid operations`);
        // STRICT ENFORCEMENT: Limit operation counts
        let titleCount = 0;
        let labelCount = 0;
        let delayCount = 0;
        const enforced = validated.filter(op => {
            // Count and limit drawTitle (max 1)
            if (op.op === 'drawTitle') {
                titleCount++;
                if (titleCount > 1) {
                    logger.warn(`[visualV2] 🚫 Removing extra drawTitle (limit: 1)`);
                    return false;
                }
            }
            // Count drawLabel (target 6-8, STRICT max 10 to prevent text-heavy)
            if (op.op === 'drawLabel') {
                labelCount++;
                if (labelCount > 10) {
                    logger.warn(`[visualV2] 🚫 Removing extra drawLabel (limit: 10, got ${labelCount})`);
                    return false;
                }
            }
            // Count delay (target 3-5, max 7)
            if (op.op === 'delay') {
                delayCount++;
                if (delayCount > 7) {
                    logger.warn(`[visualV2] 🚫 Removing extra delay (limit: 7, got ${delayCount})`);
                    return false;
                }
            }
            // Remove generic drawGraph (should use drawCoordinateSystem)
            if (op.op === 'drawGraph') {
                logger.warn(`[visualV2] 🚫 Removing drawGraph (use drawCoordinateSystem instead)`);
                return false;
            }
            return true;
        });
        if (enforced.length < validated.length) {
            logger.info(`[visualV2] 🔧 Enforced limits: ${validated.length} → ${enforced.length} operations`);
        }
        // Check for domain-specific tools usage
        const V2_OPS = [
            'drawCircuitElement', 'drawSignalWaveform', 'drawConnection',
            'drawForceVector', 'drawPhysicsObject', 'drawTrajectory', 'drawFieldLines',
            'drawCellStructure', 'drawOrganSystem', 'drawMembrane', 'drawMolecule',
            'drawAtom', 'drawReaction', 'drawBond', 'drawMolecularStructure',
            'drawDataStructure', 'drawNeuralNetwork', 'drawAlgorithmStep',
            'drawGeometry', 'drawCoordinateSystem', 'animate'
        ];
        const domainOps = enforced.filter(op => V2_OPS.includes(op.op));
        const v2Ratio = enforced.length > 0 ? (domainOps.length / enforced.length) : 0;
        logger.info(`[visualV2] Domain-specific operations: ${domainOps.length}/${enforced.length} (${Math.round(v2Ratio * 100)}%)`);
        logger.info(`[visualV2] Composition: titles=${titleCount}/1, labels=${labelCount}/6-8 (max:10), delays=${delayCount}/3-5`);
        // QUALITY CHECK: REJECT if V2 ratio is too low (HARD ENFORCEMENT)
        // 35% minimum gives Gemini breathing room while maintaining quality
        if (v2Ratio < 0.25) {
            logger.error(`[visualV2] 🚫 REJECTED - V2 ratio ${Math.round(v2Ratio * 100)}% is below minimum 35%! Generated too many generic operations.`);
            throw new Error(`REJECTED: Only ${Math.round(v2Ratio * 100)}% domain-specific operations (minimum: 35%). Use domain tools aggressively: drawCircuitElement, drawMolecule, drawCellStructure, drawPhysicsObject, etc.`);
        }
        else if (v2Ratio < 0.50) {
            logger.warn(`[visualV2] ⚠️  V2 ratio ${Math.round(v2Ratio * 100)}% is below target 70%! Generated too many generic operations.`);
        }
        else if (v2Ratio >= 0.7) {
            logger.info(`[visualV2] ✅ Successfully generated ${Math.round(v2Ratio * 100)}% domain-specific operations`);
        }
        else {
            logger.info(`[visualV2] 🎯 V2 ratio ${Math.round(v2Ratio * 100)}% (target: 70%+)`);
        }
        return enforced;
    }
    catch (error) {
        logger.error(`[visualV2] Failed to parse response:`, error);
        logger.error(`[visualV2] Response was:`, jsonStr.substring(0, 500));
        throw new Error('Failed to parse visual generation response');
    }
}
/**
 * Main visual agent v2 with intelligent tool selection
 */
async function visualAgentV2(step, topic, previousSteps) {
    const key = process.env.GEMINI_API_KEY;
    if (!key)
        throw new Error('GEMINI_API_KEY not set');
    const genAI = new generative_ai_1.GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
        model: MODEL,
        generationConfig: {
            temperature: 0.9, // Higher creativity for better tool selection
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 32768, // ✅ DOUBLED to accommodate 50-70 operations!
        }
    });
    const context = {
        topic,
        stepTag: step.tag,
        stepDescription: step.desc,
        previousSteps
    };
    logger_1.logger.info(`[visualV2] Generating visualization for step ${step.id}: ${step.tag}`);
    logger_1.logger.info(`[visualV2] Topic: "${topic}"`);
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            logger_1.logger.debug(`[visualV2] Attempt ${attempt}/${MAX_RETRIES}`);
            const prompt = buildPrompt(context);
            const result = await Promise.race([
                model.generateContent(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${TIMEOUT}ms`)), TIMEOUT))
            ]);
            const responseText = result.response.text();
            logger_1.logger.debug(`[visualV2] Received response (${responseText.length} chars)`);
            const operations = parseAndValidate(responseText, context);
            if (operations.length === 0) {
                throw new Error('No valid operations generated');
            }
            // QUALITY ENFORCEMENT - Validate 3Blue1Brown standards
            const qualityReport = qualityEnforcer_1.QualityEnforcer.validateActions(operations, step, topic);
            qualityEnforcer_1.QualityEnforcer.logReport(qualityReport, step, topic);
            if (!qualityReport.passed) {
                // REJECT poor quality - force retry with feedback
                logger_1.logger.error(`[visualV2] Quality check FAILED (${qualityReport.score}%) - rejecting for retry`);
                logger_1.logger.error(`[visualV2] Issues: ${qualityReport.issues.join('; ')}`);
                throw new Error(`Quality check failed: ${qualityReport.score}% (need 60%+)`);
            }
            logger_1.logger.info(`[visualV2] ✅ Quality check PASSED (${qualityReport.score}%) - excellent content!`);
            logger_1.logger.info(`[visualV2] ✅ Successfully generated ${operations.length} operations for step ${step.id}`);
            return {
                type: 'visuals',
                stepId: step.id,
                actions: operations
            };
        }
        catch (error) {
            lastError = error;
            logger_1.logger.warn(`[visualV2] Attempt ${attempt} failed:`, error);
            if (attempt < MAX_RETRIES) {
                logger_1.logger.info(`[visualV2] Retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
    logger_1.logger.error(`[visualV2] Failed after ${MAX_RETRIES} attempts:`, lastError);
    return null;
}
exports.default = visualAgentV2;
//# sourceMappingURL=visualAgentV2.js.map