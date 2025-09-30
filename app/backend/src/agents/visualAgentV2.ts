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

const MODEL = 'gemini-2.0-flash-exp';
const TIMEOUT = 45000; // Allow time for intelligent tool selection
const MAX_RETRIES = 2;

interface ToolSelectionContext {
  topic: string;
  stepTag: string;
  stepDescription: string;
  previousSteps?: string[];
}

/**
 * Generate comprehensive tool documentation for Gemini
 */
function generateToolDocumentation(): string {
  return `
# COMPREHENSIVE VISUAL TOOL LIBRARY

You are an expert visualization engineer. Your job is to CREATE the most appropriate
and stunning visual representation for ANY concept by SELECTING and COMPOSING tools
from this comprehensive library.

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
- drawGraph: Function plotting
  Example: { op: "drawGraph", function: "sin(x)", xMin: -3.14, xMax: 3.14, yMin: -1, yMax: 1, showGrid: true, lineColor: "#3498db" }
  
- drawGeometry: Geometric shapes with measurements
  Example: { op: "drawGeometry", shape: "triangle", vertices: [[0.3,0.6], [0.7,0.6], [0.5,0.3]], showAngles: true, showSides: true }
  
- drawLatex: Mathematical equations
  Example: { op: "drawLatex", equation: "\\\\frac{dy}{dx} = \\\\lim_{h \\\\to 0} \\\\frac{f(x+h)-f(x)}{h}", x: 0.5, y: 0.3, size: 24 }
  
- drawCoordinateSystem: 2D/3D axes
  Example: { op: "drawCoordinateSystem", type: "cartesian", xRange: [-5,5], yRange: [-5,5], showGrid: true }

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

## YOUR TASK: INTELLIGENT TOOL SELECTION

Given a step description, you must:
1. ANALYZE what needs to be visualized
2. IDENTIFY the domain (electrical, physics, biology, chemistry, math, CS, general)
3. SELECT the most appropriate tools from that domain
4. COMPOSE them into a coherent visualization
5. ADD labels and annotations for clarity
6. ENSURE no text overlap (use avoidOverlap: true)

## QUALITY STANDARDS:
✓ Use domain-specific tools (not generic circles for everything)
✓ Proper symbols (transistors for circuits, not boxes)
✓ Clear labels with anti-overlap
✓ Logical composition (input → process → output)
✓ Appropriate complexity (simple for concepts, detailed for structures)
✓ Professional appearance (like 3Blue1Brown quality)

## EXAMPLES OF GOOD TOOL SELECTION:

### Example 1: "Amplifier increases signal amplitude"
DOMAIN: Electrical
ANALYSIS: Need to show input signal, amplification process, output signal
SELECTED TOOLS:
[
  { "op": "drawTitle", "text": "Signal Amplification", "x": 0.5, "y": 0.1, "size": 28 },
  { "op": "drawSignalWaveform", "waveform": "sine", "amplitude": 0.15, "x": 0.05, "y": 0.5, "width": 0.15, "label": "Input Signal", "frequency": "1kHz" },
  { "op": "drawCircuitElement", "type": "op_amp", "x": 0.4, "y": 0.5, "rotation": 0, "label": "Op-Amp" },
  { "op": "drawConnection", "from": [0.2, 0.5], "to": [0.35, 0.48], "type": "wire", "showArrow": true },
  { "op": "drawSignalWaveform", "waveform": "sine", "amplitude": 0.4, "x": 0.65, "y": 0.5, "width": 0.15, "label": "Output Signal", "frequency": "1kHz" },
  { "op": "drawConnection", "from": [0.45, 0.5], "to": [0.65, 0.5], "type": "wire", "showArrow": true },
  { "op": "drawLatex", "equation": "A_v = \\\\frac{V_{out}}{V_{in}}", "x": 0.5, "y": 0.75, "size": 22, "color": "#3498db" },
  { "op": "drawLabel", "text": "Gain: 10x", "x": 0.4, "y": 0.65, "fontSize": 16, "avoidOverlap": true },
  { "op": "delay", "duration": 2000 }
]

### Example 2: "Newton's Third Law - action and reaction forces"
DOMAIN: Physics
ANALYSIS: Need two objects with equal and opposite forces
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
3. SELECT 30-50 operations from the appropriate tool categories
4. COMPOSE them in a logical sequence (title → visualization → labels → equations → delays)
5. ENSURE all labels use avoidOverlap: true to prevent text overlap
6. USE proper domain-specific tools (not generic shapes)

## OUTPUT FORMAT:

Return ONLY valid JSON array of operations (no markdown, no explanations):
[
  { "op": "drawTitle", "text": "...", ... },
  { "op": "domain-specific-operation", ... },
  ...
]

CRITICAL REQUIREMENTS:
- 30-50 operations for rich visualization
- **MINIMUM 70% DOMAIN-SPECIFIC OPERATIONS** (not generic shapes!)
- Use domain-specific tools AGGRESSIVELY:
  * Electrical → drawCircuitElement, drawSignalWaveform, drawConnection
  * Physics → drawForceVector, drawPhysicsObject, drawTrajectory
  * Biology → drawCellStructure, drawOrganSystem, drawMembrane, drawReaction
  * Chemistry → drawMolecule, drawAtom, drawReaction, drawBond
  * CS → drawDataStructure, drawNeuralNetwork, drawAlgorithmStep
- MAXIMUM 10 drawLabel operations (focus on visuals, not text!)
- ALL text labels must have avoidOverlap: true
- Include drawLatex for equations only when necessary
- Add delay (1500-2000ms) between major visual sequences
- AVOID generic drawDiagram - use specific domain tools instead
- Every visual element should teach something, not just decorate

Generate the visualization now:`;
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
    const operations = JSON.parse(jsonStr);
    
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
    
    // Check for domain-specific tools usage
    const domainOps = validated.filter(op => 
      ['drawCircuitElement', 'drawSignalWaveform', 'drawConnection',
       'drawForceVector', 'drawPhysicsObject', 'drawTrajectory', 'drawFieldLines',
       'drawCellStructure', 'drawOrganSystem', 'drawMembrane', 'drawMolecule', 
       'drawAtom', 'drawReaction', 'drawBond',
       'drawDataStructure', 'drawNeuralNetwork', 'drawAlgorithmStep',
       'drawGeometry', 'drawCoordinateSystem'].includes(op.op)
    );
    
    const v2Ratio = validated.length > 0 ? (domainOps.length / validated.length) : 0;
    logger.info(`[visualV2] Domain-specific operations: ${domainOps.length}/${validated.length} (${Math.round(v2Ratio*100)}%)`);
    
    // QUALITY CHECK: Warn if V2 ratio is too low
    if (v2Ratio < 0.5) {
      logger.warn(`[visualV2] ⚠️  V2 ratio ${Math.round(v2Ratio*100)}% is below target 70%! Generated too many generic operations.`);
    } else if (v2Ratio >= 0.7) {
      logger.info(`[visualV2] ✅ Successfully generated ${Math.round(v2Ratio*100)}% domain-specific operations`);
    }
    
    return validated as Action[];
    
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
      maxOutputTokens: 8192,
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
