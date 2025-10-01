/**
 * VISUAL AGENT V2 - PRODUCTION GRADE DYNAMIC VISUAL ENGINE
 * 
 * This agent INTELLIGENTLY SELECTS visualization tools based on content.
 * NO hardcoding for specific topics. TRUE dynamic generation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Action, PlanStep } from '../types';
import { logger } from '../logger';
import { VISUAL_TOOL_LIBRARY } from '../lib/visualTools';
import { QualityEnforcer } from './qualityEnforcer';

const MODEL = 'gemini-2.0-flash-exp';
const TIMEOUT = 60000; // Allow time for complex multi-diagram generation
const MAX_RETRIES = 2;

interface ToolSelectionContext {
  topic: string;
  stepTag: string;
  stepDescription: string;
  previousSteps?: string[];
}

/**
 * Generate comprehensive tool documentation for Gemini with COMPOSITION FOCUS
 */
function generateToolDocumentation(): string {
  return `
# PROFESSIONAL DIAGRAM GENERATION SYSTEM

You are an expert visualization engineer creating PROFESSIONAL EDUCATIONAL DIAGRAMS.
Your output should look like a polished textbook or technical presentation.

🎯 YOUR MISSION: Generate 50-70 operations that form 4-5 COMPLETE DIAGRAMS with:
  - Perfect alignment on invisible grid (use 0.1, 0.2, 0.3... positions)
  - Clear sectioning (multiple distinct visual concepts)
  - Rich labeling (every visual element explained)
  - Visual relationships (arrows connecting related elements)
  - Professional spacing (not cramped, not sparse)

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

## EXAMPLES OF GOOD TOOL SELECTION:

### Example 1: "Amplifier increases signal amplitude" (50+ Operations)
DOMAIN: Electrical
ANALYSIS: Need 4 sections: (1) Input, (2) Circuit, (3) Output, (4) Analysis
GRID LAYOUT:
  - Section ① (x=0.1-0.3): Input stage
  - Section ② (x=0.35-0.55): Amplifier circuit
  - Section ③ (x=0.6-0.85): Output stage
  - Section ④ (y=0.75): Mathematical analysis
SELECTED TOOLS (55 operations total):
[
  { "op": "drawTitle", "text": "Signal Amplification", "x": 0.5, "y": 0.05, "size": 28 },
  
  // SECTION ① - Input (12 operations)
  { "op": "drawLabel", "text": "① INPUT STAGE", "x": 0.2, "y": 0.15, "fontSize": 18, "bold": true },
  { "op": "drawSignalWaveform", "waveform": "sine", "amplitude": 0.08, "x": 0.05, "y": 0.4, "width": 0.25, "label": "Vin", "frequency": "1kHz" },
  { "op": "drawLabel", "text": "Small amplitude", "x": 0.15, "y": 0.55, "fontSize": 14, "avoidOverlap": true },
  { "op": "drawLabel", "text": "1V peak", "x": 0.15, "y": 0.6, "fontSize": 12 },
  { "op": "drawCircuitElement", "type": "resistor", "x": 0.25, "y": 0.35, "rotation": 0 },
  { "op": "drawLabel", "text": "1kΩ", "x": 0.25, "y": 0.3, "fontSize": 11 },
  { "op": "drawConnection", "from": [0.3, 0.4], "to": [0.35, 0.4], "type": "wire" },
  { "op": "delay", "duration": 1500 },
  
  // SECTION ② - Amplifier (18 operations)
  { "op": "drawLabel", "text": "② AMPLIFIER", "x": 0.45, "y": 0.15, "fontSize": 18, "bold": true },
  { "op": "drawCircuitElement", "type": "op_amp", "x": 0.45, "y": 0.4, "rotation": 0, "label": "LM741" },
  { "op": "drawCircuitElement", "type": "resistor", "x": 0.4, "y": 0.35, "rotation": 90, "label": "R1" },
  { "op": "drawCircuitElement", "type": "resistor", "x": 0.45, "y": 0.3, "rotation": 0, "label": "Rf=10kΩ" },
  { "op": "drawConnection", "from": [0.35, 0.4], "to": [0.4, 0.38], "type": "wire", "showArrow": true },
  { "op": "drawConnection", "from": [0.5, 0.4], "to": [0.55, 0.4], "type": "wire" },
  { "op": "drawConnection", "from": [0.45, 0.3], "to": [0.45, 0.35], "type": "wire" },
  { "op": "drawLabel", "text": "Inverting config", "x": 0.45, "y": 0.55, "fontSize": 13, "avoidOverlap": true },
  { "op": "drawLatex", "equation": "A_v = -\\\\frac{R_f}{R_{in}}", "x": 0.45, "y": 0.62, "size": 16 },
  { "op": "delay", "duration": 2000 },
  
  // SECTION ③ - Output (13 operations)
  { "op": "drawLabel", "text": "③ OUTPUT STAGE", "x": 0.7, "y": 0.15, "fontSize": 18, "bold": true },
  { "op": "drawSignalWaveform", "waveform": "sine", "amplitude": 0.25, "x": 0.6, "y": 0.4, "width": 0.25, "label": "Vout", "frequency": "1kHz", "phase": 180 },
  { "op": "drawLabel", "text": "Amplified 10×", "x": 0.7, "y": 0.55, "fontSize": 14, "avoidOverlap": true },
  { "op": "drawLabel", "text": "10V peak", "x": 0.7, "y": 0.6, "fontSize": 12 },
  { "op": "drawLabel", "text": "Phase inverted", "x": 0.7, "y": 0.65, "fontSize": 12, "color": "#e74c3c" },
  { "op": "drawConnection", "from": [0.55, 0.4], "to": [0.6, 0.4], "type": "wire", "showArrow": true },
  { "op": "delay", "duration": 1500 },
  
  // SECTION ④ - Analysis (12 operations)
  { "op": "drawLabel", "text": "④ GAIN ANALYSIS", "x": 0.5, "y": 0.72, "fontSize": 18, "bold": true },
  { "op": "drawLatex", "equation": "V_{out} = A_v \\\\times V_{in}", "x": 0.3, "y": 0.8, "size": 18 },
  { "op": "drawLatex", "equation": "10V = -10 \\\\times 1V", "x": 0.3, "y": 0.87, "size": 16, "color": "#27ae60" },
  { "op": "drawLatex", "equation": "P_{out} = \\\\frac{V_{out}^2}{R_L}", "x": 0.65, "y": 0.8, "size": 16 },
  { "op": "drawLabel", "text": "Power gain: 100×", "x": 0.65, "y": 0.87, "fontSize": 14 },
  { "op": "delay", "duration": 2000 }
]
// ✅ Total: 55 operations (within 50-70 target)
// ✅ 4 section markers (① ② ③ ④)
// ✅ ~75% domain-specific operations (circuits, waveforms, connections)

### Example 2: "Newton's Third Law" (Multi-Diagram Composition)
DOMAIN: Physics  
ANALYSIS: Need 4 diagrams: (1) Setup, (2) Force pairs, (3) Free body diagrams, (4) Real example
GRID LAYOUT:
  - Top-left (0.2, 0.25): Two blocks pushing
  - Top-right (0.7, 0.25): Force vectors
  - Bottom-left (0.2, 0.65): Free body diagram A
  - Bottom-right (0.7, 0.65): Free body diagram B
SELECTED TOOLS:
[
  { "op": "drawTitle", "text": "Newton's Third Law", "x": 0.5, "y": 0.1, "size": 28 },
  { "op": "drawPhysicsObject", "shape": "box", "x": 0.3, "y": 0.5, "width": 0.12, "height": 0.12, "mass": 10, "label": "Block A", "color": "#3498db" },
  { "op": "drawPhysicsObject", "shape": "box", "x": 0.7, "y": 0.5, "width": 0.12, "height": 0.12, "mass": 10, "label": "Block B", "color": "#e74c3c" },
  { "op": "drawForceVector", "x": 0.42, "y": 0.5, "dx": 0.15, "dy": 0, "magnitude": 5, "label": "F_{AB} = 5N", "color": "#ff0000" },
  { "op": "drawForceVector", "x": 0.58, "y": 0.5, "dx": -0.15, "dy": 0, "magnitude": 5, "label": "F_{BA} = 5N", "color": "#0000ff" },
  { "op": "drawLatex", "equation": "F_{AB} = -F_{BA}", "x": 0.5, "y": 0.25, "size": 24 },
  { "op": "drawLabel", "text": "Forces are equal in magnitude", "x": 0.5, "y": 0.75, "fontSize": 14, "avoidOverlap": true },
  { "op": "drawLabel", "text": "Forces are opposite in direction", "x": 0.5, "y": 0.82, "fontSize": 14, "avoidOverlap": true },
  { "op": "delay", "duration": 2000 }
]

### Example 3: "Neuron cell structure and function"
DOMAIN: Biology
ANALYSIS: Need detailed cell structure with labeled parts
SELECTED TOOLS:
[
  { "op": "drawTitle", "text": "Neuron Structure", "x": 0.5, "y": 0.1, "size": 28 },
  { "op": "drawCellStructure", "type": "neuron", "x": 0.5, "y": 0.5, "size": 0.4, "showOrganelles": true, "organelles": ["nucleus", "dendrites", "axon", "synapses"], "detail": "high", "labels": true },
  { "op": "drawLabel", "text": "Dendrites: Receive signals", "x": 0.15, "y": 0.3, "fontSize": 14, "avoidOverlap": true, "connectedTo": {"x": 0.35, "y": 0.4} },
  { "op": "drawLabel", "text": "Soma: Cell body with nucleus", "x": 0.15, "y": 0.5, "fontSize": 14, "avoidOverlap": true, "connectedTo": {"x": 0.4, "y": 0.5} },
  { "op": "drawLabel", "text": "Axon: Transmits signals", "x": 0.15, "y": 0.7, "fontSize": 14, "avoidOverlap": true, "connectedTo": {"x": 0.6, "y": 0.5} },
  { "op": "drawForceVector", "x": 0.35, "y": 0.5, "dx": 0.3, "dy": 0, "magnitude": 1, "label": "Signal Flow", "color": "#00ff00" },
  { "op": "delay", "duration": 2000 }
]

Now generate the visualization for this step using INTELLIGENT TOOL SELECTION.
`;
}

/**
 * Build the generation prompt with tool documentation
 */
function buildPrompt(context: ToolSelectionContext): string {
  const { topic, stepTag, stepDescription } = context;
  
  const stepTitles: Record<string, string> = {
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
3. SELECT 50-70 operations from the appropriate tool categories (NOT 30-50!)
4. CREATE 4-5 SECTIONS with markers (① ② ③ ④ ⑤) - MANDATORY!
5. COMPOSE them in a logical sequence (title → section① → section② → section③ → section④ → summary)
6. ENSURE all labels use avoidOverlap: true to prevent text overlap
7. PRIORITIZE domain-specific tools (60-70% of operations MUST be V2 tools)

## OUTPUT FORMAT:

Return ONLY valid JSON array of operations (no markdown, no explanations):
[
  { "op": "drawTitle", "text": "...", ... },
  { "op": "domain-specific-operation", ... },
  ...
]

🔥 CRITICAL REQUIREMENTS (STRICTLY ENFORCED - REJECTION IF NOT MET):

🚨 OPERATION COUNT: Generate EXACTLY 50-70 operations
   - Count your operations as you generate!
   - Less than 50 = AUTOMATIC REJECTION
   - More than 70 = AUTOMATIC REJECTION
   - Aim for 55-60 for safety

🚨 SECTION MARKERS: Include 4-5 labels with ① ② ③ ④ ⑤ symbols
   - Example: { "op": "drawLabel", "text": "① INPUT STAGE", "x": 0.2, "y": 0.15, "bold": true }
   - NO section markers = AUTOMATIC REJECTION
   - These organize your multi-diagram composition

🚨🚨🚨 DOMAIN-SPECIFIC OPERATIONS: 60-70% REQUIRED (STRICT ENFORCEMENT)
   - **TARGET: 60-70% V2 operations (not just 35%!)**
   - **MINIMUM: 35% to pass, but AIM FOR 60-70%**
   
   ⛔ BANNED (Use <20% total - ONLY for pure geometry/counting):
   ❌ drawCircle - forbidden except for pure circular shapes
   ❌ drawRect - forbidden except for generic containers
   ❌ drawLine - forbidden except for basic connections
   
   ✅ REQUIRED (Use 60-70% total - THIS IS YOUR PRIMARY TOOLBOX):
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
  
🎬 ANIMATIONS (15-20% MANDATORY - MUST INCLUDE 8-12 ANIMATION OPERATIONS):
  
  **YOU MUST USE AT LEAST 8-12 ANIMATIONS PER STEP:**
  ✅ orbit (use 4-6 times) - electrons, planets, cycles, rotation
  ✅ wave (use 2-3 times) - signals, oscillations, propagation
  ✅ particle (use 2-3 times) - flow, transfer, emission, diffusion
  
  ORBIT EXAMPLES:
  { "op": "orbit", "center": [0.3, 0.5], "radius": 0.08, "count": 6, "speed": 2, "color": "#3498db", "label": "Electrons orbiting" }
  { "op": "orbit", "center": [0.7, 0.5], "radius": 0.12, "count": 8, "speed": 1.5, "color": "#e74c3c", "label": "Planet rotation" }
  
  WAVE EXAMPLES:
  { "op": "wave", "points": [[0.2,0.4], [0.5,0.4], [0.8,0.4]], "amplitude": 0.05, "frequency": 2, "color": "#f39c12" }
  { "op": "wave", "points": [[0.2,0.6], [0.5,0.6], [0.8,0.6]], "amplitude": 0.03, "frequency": 3, "color": "#9b59b6" }
  
  PARTICLE EXAMPLES:
  { "op": "particle", "source": [0.2, 0.5], "target": [0.5, 0.5], "count": 20, "speed": 1.5, "color": "#27ae60", "size": 3 }
  { "op": "particle", "source": [0.5, 0.5], "target": [0.8, 0.5], "count": 15, "speed": 2, "color": "#e67e22", "size": 2 }
  
  **EVERY CONCEPT NEEDS ANIMATION. NO STATIC DIAGRAMS ONLY!**
  Use animations to show:
  - Energy transfer (particle systems)
  - Periodic motion (waves, orbits)
  - Molecular dynamics (electrons orbiting atoms)
  - Signal propagation (waves through circuits)
  - Process flow (particles between components)
  - Time evolution (orbits showing cycles)

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
function parseAndValidate(response: string, context: ToolSelectionContext): Action[] {
  const logger = require('../logger').logger;
  
  // Extract JSON from response
  let jsonStr = response.trim();
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```\n?/g, '');
  }
  
  jsonStr = jsonStr.trim();
  
  try {
    let operations;
    
    try {
      // Try normal parsing first
      operations = JSON.parse(jsonStr);
    } catch (parseError) {
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
          } catch (repairError) {
            logger.error(`[visualV2] Repair failed:`, repairError);
            throw parseError; // Throw original error
          }
        } else {
          throw parseError;
        }
      } else {
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
    
    logger.info(`[visualV2] Domain-specific operations: ${domainOps.length}/${enforced.length} (${Math.round(v2Ratio*100)}%)`);
    logger.info(`[visualV2] Composition: titles=${titleCount}/1, labels=${labelCount}/6-8 (max:10), delays=${delayCount}/3-5`);
    
    // QUALITY CHECK: REJECT if V2 ratio is too low (HARD ENFORCEMENT)
    // 35% minimum gives Gemini breathing room while maintaining quality
    if (v2Ratio < 0.25) {
      logger.error(`[visualV2] 🚫 REJECTED - V2 ratio ${Math.round(v2Ratio*100)}% is below minimum 35%! Generated too many generic operations.`);
      throw new Error(`REJECTED: Only ${Math.round(v2Ratio*100)}% domain-specific operations (minimum: 35%). Use domain tools aggressively: drawCircuitElement, drawMolecule, drawCellStructure, drawPhysicsObject, etc.`);
    } else if (v2Ratio < 0.50) {
      logger.warn(`[visualV2] ⚠️  V2 ratio ${Math.round(v2Ratio*100)}% is below target 70%! Generated too many generic operations.`);
    } else if (v2Ratio >= 0.7) {
      logger.info(`[visualV2] ✅ Successfully generated ${Math.round(v2Ratio*100)}% domain-specific operations`);
    } else {
      logger.info(`[visualV2] 🎯 V2 ratio ${Math.round(v2Ratio*100)}% (target: 70%+)`);
    }
    
    return enforced as Action[];
    
  } catch (error) {
    logger.error(`[visualV2] Failed to parse response:`, error);
    logger.error(`[visualV2] Response was:`, jsonStr.substring(0, 500));
    throw new Error('Failed to parse visual generation response');
  }
}

/**
 * Main visual agent v2 with intelligent tool selection
 */
export async function visualAgentV2(
  step: PlanStep,
  topic: string,
  previousSteps?: string[]
): Promise<{ type: 'visuals'; stepId: number; actions: Action[] } | null> {
  
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ 
    model: MODEL,
    generationConfig: {
      temperature: 0.9, // Higher creativity for better tool selection
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 32768, // ✅ DOUBLED to accommodate 50-70 operations!
    }
  });
  
  const context: ToolSelectionContext = {
    topic,
    stepTag: step.tag,
    stepDescription: step.desc,
    previousSteps
  };
  
  logger.info(`[visualV2] Generating visualization for step ${step.id}: ${step.tag}`);
  logger.info(`[visualV2] Topic: "${topic}"`);
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.debug(`[visualV2] Attempt ${attempt}/${MAX_RETRIES}`);
      
      const prompt = buildPrompt(context);
      
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout after ${TIMEOUT}ms`)), TIMEOUT)
        )
      ]);
      
      const responseText = result.response.text();
      logger.debug(`[visualV2] Received response (${responseText.length} chars)`);
      
      const operations = parseAndValidate(responseText, context);
      
      if (operations.length === 0) {
        throw new Error('No valid operations generated');
      }
      
      // QUALITY ENFORCEMENT - Validate 3Blue1Brown standards
      const qualityReport = QualityEnforcer.validateActions(operations, step, topic);
      QualityEnforcer.logReport(qualityReport, step, topic);
      
      if (!qualityReport.passed) {
        // REJECT poor quality - force retry with feedback
        logger.error(`[visualV2] Quality check FAILED (${qualityReport.score}%) - rejecting for retry`);
        logger.error(`[visualV2] Issues: ${qualityReport.issues.join('; ')}`);
        throw new Error(`Quality check failed: ${qualityReport.score}% (need 60%+)`);
      }
      
      logger.info(`[visualV2] ✅ Quality check PASSED (${qualityReport.score}%) - excellent content!`);
      logger.info(`[visualV2] ✅ Successfully generated ${operations.length} operations for step ${step.id}`);
      
      return {
        type: 'visuals',
        stepId: step.id,
        actions: operations
      };
      
    } catch (error) {
      lastError = error as Error;
      logger.warn(`[visualV2] Attempt ${attempt} failed:`, error);
      
      if (attempt < MAX_RETRIES) {
        logger.info(`[visualV2] Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  logger.error(`[visualV2] Failed after ${MAX_RETRIES} attempts:`, lastError);
  return null;
}

export default visualAgentV2;
