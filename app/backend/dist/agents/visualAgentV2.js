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
const MODEL = 'gemini-2.0-flash-exp';
const TIMEOUT = 45000; // Allow time for intelligent tool selection
const MAX_RETRIES = 2;
/**
 * Generate comprehensive tool documentation for Gemini
 */
function generateToolDocumentation() {
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

CRITICAL REQUIREMENTS (STRICTLY ENFORCED):

🚨 OPERATION LIMITS (WILL BE VALIDATED):
- **EXACTLY 1 drawTitle** - One title at the start ONLY
- **MAXIMUM 5 drawLabel** - More visuals, less text!
- **MAXIMUM 3 delay** - Keep it flowing, not pausing
- **MINIMUM 25 V2 operations** - Domain-specific tools are MANDATORY

📊 V2 RATIO TARGET: 70%+ (Your output WILL be scored)
- 30-40 total operations per step
- At least 25 MUST be domain-specific (V2)
- Maximum 5 can be text/delays (V1)

⚡ DOMAIN-SPECIFIC TOOLS (Use these AGGRESSIVELY):
  * Electrical → drawCircuitElement, drawSignalWaveform, drawConnection
  * Physics → drawForceVector, drawPhysicsObject, drawTrajectory, drawFieldLines
  * Biology → drawCellStructure, drawOrganSystem, drawMembrane, drawMolecularStructure
  * Chemistry → drawMolecule, drawAtom, drawReaction, drawBond
  * CS → drawDataStructure, drawNeuralNetwork, drawAlgorithmStep
  * Math → drawCoordinateSystem (NOT drawGraph!), drawGeometry
  * Animations → animate (use for motion, transformation, emphasis)

❌ WHAT TO AVOID:
- DO NOT use multiple drawTitle operations
- DO NOT use drawGraph (use drawCoordinateSystem + drawCurve instead)
- DO NOT use generic drawDiagram (use domain-specific alternatives)
- DO NOT overuse drawLabel (maximum 5!)
- DO NOT add many delays (maximum 3!)

✅ GOOD EXAMPLE (70% V2):
[
  { "op": "drawTitle", ... },                    // 1 title ✓
  { "op": "drawPhysicsObject", ... },            // V2 ✓
  { "op": "drawPhysicsObject", ... },            // V2 ✓
  { "op": "drawForceVector", ... },              // V2 ✓
  { "op": "drawForceVector", ... },              // V2 ✓
  { "op": "drawTrajectory", ... },               // V2 ✓
  { "op": "animate", ... },                      // V2 ✓
  { "op": "drawLabel", ... },                    // V1
  { "op": "drawPhysicsObject", ... },            // V2 ✓
  { "op": "animate", ... },                      // V2 ✓
  { "op": "drawLabel", ... },                    // V1
  { "op": "delay", ... }                         // V1
  // Result: 8 V2 / 12 total = 67% (acceptable)
]

❌ BAD EXAMPLE (30% V2):
[
  { "op": "drawTitle", ... },
  { "op": "drawTitle", ... },                    // ❌ Too many titles!
  { "op": "drawLabel", ... },
  { "op": "drawLabel", ... },
  { "op": "drawLabel", ... },
  { "op": "drawLabel", ... },
  { "op": "drawLabel", ... },
  { "op": "drawLabel", ... },                    // ❌ Too many labels!
  { "op": "drawGraph", ... },                    // ❌ Use drawCoordinateSystem!
  { "op": "delay", ... },
  { "op": "delay", ... },
  { "op": "delay", ... },                        // ❌ Too many delays!
  { "op": "drawPhysicsObject", ... }             // Only 1 V2 operation!
  // Result: 1 V2 / 12 total = 8% (REJECTED!)
]

🎯 YOUR GOAL: Generate 30-40 operations with 70%+ being domain-specific V2 tools

Generate the visualization now:`;
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
            // Count and limit drawLabel (max 5)
            if (op.op === 'drawLabel') {
                labelCount++;
                if (labelCount > 5) {
                    logger.warn(`[visualV2] 🚫 Removing extra drawLabel (limit: 5, got ${labelCount})`);
                    return false;
                }
            }
            // Count and limit delay (max 3)
            if (op.op === 'delay') {
                delayCount++;
                if (delayCount > 3) {
                    logger.warn(`[visualV2] 🚫 Removing extra delay (limit: 3, got ${delayCount})`);
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
        logger.info(`[visualV2] Limits: titles=${titleCount}/1, labels=${labelCount}/5, delays=${delayCount}/3`);
        // QUALITY CHECK: Warn if V2 ratio is too low
        if (v2Ratio < 0.5) {
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
            maxOutputTokens: 16384, // ✅ INCREASED to prevent truncation!
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
