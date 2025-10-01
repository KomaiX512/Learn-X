"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visualAgent = visualAgent;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const circuit_breaker_1 = require("../services/circuit-breaker");
const MODEL = 'gemini-2.0-flash-exp';
const TIMEOUT = 30000; // 30 seconds for QUALITY generation
const BATCH_SIZE = 20; // Generate comprehensive visual story with labels
const MAX_RETRIES = 2; // Allow retries for quality
// Circuit breaker for Gemini API
const geminiBreaker = new circuit_breaker_1.CircuitBreaker('gemini-visual', {
    failureThreshold: 2,
    resetTimeout: 5000,
    monitoringPeriod: 30000
});
function withTimeout(p, ms) {
    return Promise.race([
        p,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after ' + ms + 'ms')), ms))
    ]);
}
// Production-optimized visual generation with RICH EDUCATIONAL CONTENT
async function visualAgent(step, topic) {
    const key = process.env.GEMINI_API_KEY;
    if (!key)
        throw new Error('GEMINI_API_KEY not set');
    const genAI = new generative_ai_1.GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: MODEL });
    // CINEMATIC 3BLUE1BROWN QUALITY PROMPT
    const stepTitles = {
        'hook': '✨ The Hook - Why Should You Care?',
        'formalism': '📐 The Mathematics - Precise & Beautiful',
        'exploration': '🔬 Deeper Exploration - What If?',
        'mastery': '🚀 Mastery - Real World Power'
    };
    // Detect topic requirements for validation
    const topicLower = topic.toLowerCase();
    const requiresLatex = topicLower.match(/calculus|derivative|integral|equation|formula|theorem|proof|algebra|geometry|math|physics|trigonometry|logarithm|exponential|pythagorean|euler|fourier/);
    const requiresDiagram = topicLower.match(/neuron|brain|heart|anatomy|cell|dna|molecule|circuit|network|structure/);
    const prompt = `Generate exactly 35-65 visual operations for teaching "${topic}" in the "${step.tag}" step.

CRITICAL: You are creating 3Blue1Brown-style VISUAL animations with CONTEXTUAL VARIETY.

MANDATORY VARIETY REQUIREMENTS:
- Use AT LEAST 5 different operation types
- Include mathematical equations if relevant (using latex)
- Add simulations for dynamic concepts
- Create diagrams for structural information
- NO MORE than 30% basic shapes (circles/rectangles)

Step ${step.id}: ${stepTitles[step.tag] || step.tag}

CONTEXT: ${step.desc}

CINEMATIC REQUIREMENTS FOR 3BLUE1BROWN QUALITY:
1. START with elegant title in a box: drawTitle
2. EVERY concept needs visual + label explanation
3. Generate 40-50 operations for RICH cinematic experience
4. Use delays (1-2 seconds) between major concepts
5. ALL content MUST be about "${topic}" specifically

MANDATORY CINEMATIC STRUCTURE (40-50 operations):
1. Title Sequence (3-4 ops):
   - drawTitle with elegant formatting
   - drawLabel with subtitle/question
   - Visual accent (particles or glow)

2. Opening Visual Hook (8-10 ops):
   - Start with surprising visual
   - Build curiosity with animation
   - Label key observations

3. Core Concept Development (15-20 ops):
   - Progressive visual building
   - Each visual has explanatory label
   - Use colors to show relationships
   - Animate transformations

4. Deep Insight Moment (8-10 ops):
   - The "aha!" visualization
   - Connect to bigger picture
   - Mathematical beauty revealed

5. Conclusion & Transition (5-6 ops):
   - Summarize visually
   - Preview next concept
   - Elegant fade/transition

ENHANCED OPERATIONS FOR TRUE 3BLUE1BROWN:

=== MATHEMATICAL OPERATIONS (USE THESE FOR MATH TOPICS!) ===
latex "\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}" x y size #color animated(true/false)
latex "a^2 + b^2 = c^2" x y size #color animated
latex "\\frac{dy}{dx} = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}" x y size #color animated
equation "f(x) = ax^2 + bx + c" x y #color
matrix [[a,b],[c,d]] x y scale #color animated
graph "sin(x)" xMin xMax yMin yMax gridOn #lineColor #gridColor

=== COMPLEX DIAGRAMS (USE THESE FOR ANATOMY/BIOLOGY/CIRCUITS!) ===
neuralNetwork [3,4,2,1] x y activation showWeights
molecule "H2O" x y bondAngles atomColors
anatomy "heart" x y layer detail
circuit "RC" x y components connections
flowchart {nodes:["A","B","C"], edges:[[0,1],[1,2]]} x y scale
plot [dataPoints] x y width height type(line/bar/scatter) #color

=== SIMULATIONS & PHYSICS ===
simulate "pendulum" x y length mass gravity damping
linearMotion startX startY endX endY duration "label" #color
circularMotion centerX centerY radius angularVelocity #color "object"
springOscillation x y amplitude frequency damping #color
fieldLines type(electric/magnetic) sourceX sourceY strength #color
waveInterference source1X source1Y source2X source2Y frequency amplitude

=== COMPLEX DIAGRAMS ===
flowchart {nodes:[...], edges:[...]} x y scale
neuralNetwork [layers] x y activation showWeights
circuitDiagram components connections x y scale
molecularStructure "H2O" x y bondLength animated
anatomyDiagram "heart" x y scale showLabels animated
dataFlow {sources:[...], transformations:[...], sinks:[...]} x y

=== BASIC SHAPES (use sparingly, <30%) ===
drawCircle x y radius #color fill(true/false)
drawRect x y width height #color fill(true/false)
drawVector x1 y1 x2 y2 #color "label"
arrow x y length angle #color curved(true/false)

=== ANIMATIONS ===
morph shape1 shape2 duration x y
rotate object angle duration centerX centerY
scale object factor duration originX originY
fadeIn object duration
fadeOut object duration
pulse object minScale maxScale frequency

=== TIMING ===
delay seconds

CONTEXTUAL EXAMPLE for "${topic}" (adapt based on subject):

⚠️ CRITICAL: For MATHEMATICAL topics, you MUST include LaTeX equations!
⚠️ CRITICAL: For BIOLOGY/ANATOMY topics, use neuralNetwork, molecule, or anatomy operations!

For Mathematics (MANDATORY LaTeX):
drawTitle "${stepTitles[step.tag] || step.tag}: ${topic}" 0.5 0.08
delay 1
latex "\\frac{d}{dx}[x^n] = nx^{n-1}" 0.5 0.2 28 #3498db true
delay 1.5
drawLabel "The power rule in action" 0.5 0.3 #ffffff 18
graph "x^2" -2 2 0 8 true #e74c3c #333333
delay 1
latex "\\frac{d}{dx}[x^2] = 2x" 0.7 0.5 24 #00ff88 true
linearMotion 0.2 0.6 0.8 0.4 2 "tangent line" #00ff88
delay 1

For Physics (MANDATORY LaTeX for equations):
drawTitle "${stepTitles[step.tag] || step.tag}: ${topic}" 0.5 0.08
delay 1
latex "F = ma" 0.5 0.2 32 #ffffff true
delay 1
simulate "pendulum" 0.5 0.4 0.3 1 9.8 0.02
fieldLines electric 0.3 0.6 5 #3498db
latex "E = \\frac{1}{2}mv^2" 0.7 0.75 24 #00ff88 true
linearMotion 0.2 0.8 0.8 0.8 3 "projectile" #e74c3c
delay 1

For Computer Science / Algorithms:
drawTitle "${stepTitles[step.tag] || step.tag}: ${topic}" 0.5 0.08
delay 1
flowchart {nodes:["Start","Process","Decision","End"], edges:[[0,1],[1,2],[2,3]]} 0.5 0.4 1
delay 1.5
neuralNetwork [3,4,2,1] 0.5 0.7 "ReLU" true
drawLabel "Neural network architecture" 0.5 0.9 #ffffff 16
delay 1

For Biology / Anatomy:
drawTitle "${stepTitles[step.tag] || step.tag}: ${topic}" 0.5 0.08
delay 1
anatomy "heart" 0.3 0.4 2 high
drawLabel "Blood flow pathway" 0.3 0.7 #ffffff 16
delay 1
molecule "DNA" 0.7 0.4 double-helix #3498db
drawLabel "Double helix structure" 0.7 0.7 #ffffff 16
delay 1

For Molecules / Chemistry:
molecule "H2O" 0.3 0.3 bent 104.5
drawLabel "Water molecule (bent shape)" 0.3 0.5 #ffffff 16
molecule "CO2" 0.7 0.3 linear 180
drawLabel "Carbon dioxide (linear)" 0.7 0.5 #ffffff 16
delay 1

Now generate COMPLETE, LABELED animations for: "${topic}" - ${step.tag}
Remember: EVERY visual needs a label explaining what it represents!`;
    const allActions = [];
    const targetBatches = 1; // Single comprehensive generation
    // Generate batches in parallel for speed
    const batchPromises = [];
    for (let batch = 0; batch < targetBatches; batch++) {
        const batchPromise = (async () => {
            for (let retry = 0; retry <= MAX_RETRIES; retry++) {
                try {
                    const res = await geminiBreaker.execute(async () => withTimeout(model.generateContent(prompt), TIMEOUT));
                    const text = res.response.text().trim();
                    // DEBUG: Log first 500 chars of response
                    logger_1.logger.debug('[visual] Gemini response preview: ' + text.substring(0, 500));
                    // Check if latex is in response
                    if (text.includes('latex')) {
                        logger_1.logger.debug('[visual] LaTeX FOUND in Gemini response!');
                    }
                    else {
                        logger_1.logger.debug('[visual] NO LaTeX in Gemini response');
                    }
                    // Parse rich operation format
                    const lines = text.split('\n').filter(line => line.trim());
                    const batchActions = [];
                    for (const line of lines) {
                        // Handle quoted text in operations
                        const quotedTextMatch = line.match(/"([^"]*)"/g);
                        const quotedTexts = quotedTextMatch ? quotedTextMatch.map(t => t.slice(1, -1)) : [];
                        // Replace quoted text with placeholders
                        let processedLine = line;
                        quotedTexts.forEach((text, i) => {
                            processedLine = processedLine.replace(`"${text}"`, `__QUOTE_${i}__`);
                        });
                        const parts = processedLine.trim().split(/\s+/);
                        if (parts.length < 2)
                            continue;
                        // Restore quoted text
                        parts.forEach((part, i) => {
                            const match = part.match(/__QUOTE_(\d+)__/);
                            if (match) {
                                parts[i] = quotedTexts[parseInt(match[1])];
                            }
                        });
                        const cmd = parts[0].toLowerCase();
                        // Parse all rich operations
                        switch (cmd) {
                            case 'drawtitle':
                                if (parts.length >= 4) {
                                    batchActions.push({
                                        op: 'drawTitle',
                                        text: parts[1],
                                        y: parseFloat(parts[3]) || 0.1
                                    });
                                }
                                break;
                            case 'drawlabel':
                                if (parts.length >= 4) {
                                    batchActions.push({
                                        op: 'drawLabel',
                                        text: parts[1],
                                        x: parseFloat(parts[2]) || 0.5,
                                        y: parseFloat(parts[3]) || 0.5,
                                        color: parts[4] || '#ffffff',
                                        fontSize: parseInt(parts[5]) || 16,
                                        normalized: true
                                    });
                                }
                                break;
                            case 'drawcircle':
                                if (parts.length >= 4) {
                                    const x = parseFloat(parts[1]);
                                    const y = parseFloat(parts[2]);
                                    const r = parseFloat(parts[3]);
                                    if (!isNaN(x) && !isNaN(y) && !isNaN(r)) {
                                        batchActions.push({
                                            op: 'drawCircle',
                                            x: Math.max(0, Math.min(1, x)),
                                            y: Math.max(0, Math.min(1, y)),
                                            radius: Math.max(0.02, Math.min(0.3, r)),
                                            color: parts[4] || '#3498db',
                                            fill: parts[5] === 'true',
                                            normalized: true
                                        });
                                    }
                                }
                                break;
                            case 'drawvector':
                                if (parts.length >= 5) {
                                    const x1 = parseFloat(parts[1]);
                                    const y1 = parseFloat(parts[2]);
                                    const x2 = parseFloat(parts[3]);
                                    const y2 = parseFloat(parts[4]);
                                    if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
                                        batchActions.push({
                                            op: 'drawVector',
                                            x1: Math.max(0, Math.min(1, x1)),
                                            y1: Math.max(0, Math.min(1, y1)),
                                            x2: Math.max(0, Math.min(1, x2)),
                                            y2: Math.max(0, Math.min(1, y2)),
                                            color: parts[5] || '#e74c3c',
                                            label: parts[6] || '',
                                            normalized: true
                                        });
                                    }
                                }
                                break;
                            case 'latex':
                                if (parts.length >= 4) {
                                    batchActions.push({
                                        op: 'latex',
                                        equation: parts[1],
                                        x: parseFloat(parts[2]) || 0.5,
                                        y: parseFloat(parts[3]) || 0.5,
                                        size: parseInt(parts[4]) || 24,
                                        color: parts[5] || '#ffffff',
                                        animated: parts[6] === 'true'
                                    });
                                }
                                break;
                            case 'graph':
                                if (parts.length >= 5) {
                                    batchActions.push({
                                        op: 'graph',
                                        function: parts[1],
                                        xMin: parseFloat(parts[2]) || -5,
                                        xMax: parseFloat(parts[3]) || 5,
                                        yMin: parseFloat(parts[4]) || -5,
                                        yMax: parseFloat(parts[5]) || 5,
                                        gridOn: parts[6] === 'true',
                                        lineColor: parts[7] || '#3498db',
                                        gridColor: parts[8] || '#333333'
                                    });
                                }
                                break;
                            case 'simulate':
                                if (parts.length >= 4) {
                                    batchActions.push({
                                        op: 'simulate',
                                        type: parts[1],
                                        x: parseFloat(parts[2]) || 0.5,
                                        y: parseFloat(parts[3]) || 0.5,
                                        params: parts.slice(4)
                                    });
                                }
                                break;
                            case 'linearmotion':
                                if (parts.length >= 6) {
                                    batchActions.push({
                                        op: 'linearMotion',
                                        startX: parseFloat(parts[1]) || 0,
                                        startY: parseFloat(parts[2]) || 0,
                                        endX: parseFloat(parts[3]) || 1,
                                        endY: parseFloat(parts[4]) || 1,
                                        duration: parseFloat(parts[5]) || 2,
                                        label: parts[6] || '',
                                        color: parts[7] || '#3498db'
                                    });
                                }
                                break;
                            case 'circularmotion':
                                if (parts.length >= 5) {
                                    batchActions.push({
                                        op: 'circularMotion',
                                        centerX: parseFloat(parts[1]) || 0.5,
                                        centerY: parseFloat(parts[2]) || 0.5,
                                        radius: parseFloat(parts[3]) || 0.2,
                                        angularVelocity: parseFloat(parts[4]) || 1,
                                        color: parts[5] || '#3498db',
                                        object: parts[6] || 'point'
                                    });
                                }
                                break;
                            case 'orbit':
                                if (parts.length >= 5) {
                                    batchActions.push({
                                        op: 'orbit',
                                        centerX: parseFloat(parts[1]) || 0.5,
                                        centerY: parseFloat(parts[2]) || 0.5,
                                        radius: parseFloat(parts[3]) || 0.2,
                                        speed: parseFloat(parts[4]) || 1,
                                        color: parts[5] || '#00ff88'
                                    });
                                }
                                break;
                            case 'wave':
                                if (parts.length >= 5) {
                                    batchActions.push({
                                        op: 'wave',
                                        startX: parseFloat(parts[1]) || 0.1,
                                        startY: parseFloat(parts[2]) || 0.5,
                                        amplitude: parseFloat(parts[3]) || 0.1,
                                        frequency: parseFloat(parts[4]) || 2,
                                        color: parts[5] || '#00bbff'
                                    });
                                }
                                break;
                            case 'particle':
                                if (parts.length >= 6) {
                                    batchActions.push({
                                        op: 'particle',
                                        x: parseFloat(parts[1]) || 0.5,
                                        y: parseFloat(parts[2]) || 0.5,
                                        count: parseInt(parts[3]) || 20,
                                        lifetime: parseFloat(parts[4]) || 3,
                                        speed: parseFloat(parts[5]) || 0.5,
                                        color: parts[6] || '#ffff00'
                                    });
                                }
                                break;
                            case 'delay':
                                if (parts.length >= 2) {
                                    batchActions.push({
                                        op: 'delay',
                                        duration: parseFloat(parts[1]) || 1
                                    });
                                }
                                break;
                            case 'drawaxis':
                                batchActions.push({
                                    op: 'drawAxis',
                                    xLabel: parts[1] || 'X',
                                    yLabel: parts[2] || 'Y'
                                });
                                break;
                            case 'drawrect':
                                if (parts.length >= 5) {
                                    batchActions.push({
                                        op: 'drawRect',
                                        x: parseFloat(parts[1]) || 0.5,
                                        y: parseFloat(parts[2]) || 0.5,
                                        width: parseFloat(parts[3]) || 0.2,
                                        height: parseFloat(parts[4]) || 0.2,
                                        color: parts[5] || '#f59e0b',
                                        fill: parts[6] === 'true',
                                        normalized: true
                                    });
                                }
                                break;
                            case 'drawcurve':
                                if (parts.length >= 4) {
                                    batchActions.push({
                                        op: 'drawGraph',
                                        func: parts[1],
                                        domain: [parseFloat(parts[2]) || -5, parseFloat(parts[3]) || 5],
                                        color: parts[4] || '#00ff88',
                                        scale: 50
                                    });
                                }
                                break;
                            case 'arrow':
                                if (parts.length >= 5) {
                                    batchActions.push({
                                        op: 'arrow',
                                        x: parseFloat(parts[1]) || 0.5,
                                        y: parseFloat(parts[2]) || 0.5,
                                        length: parseFloat(parts[3]) || 0.2,
                                        angle: parseFloat(parts[4]) || 0,
                                        color: parts[5] || '#ffffff',
                                        animated: parts[6] === 'true'
                                    });
                                }
                                break;
                            case 'field':
                                if (parts.length >= 3) {
                                    batchActions.push({
                                        op: 'field',
                                        type: parts[1] || 'vector',
                                        gridSize: parseInt(parts[2]) || 10,
                                        strength: parseFloat(parts[3]) || 1
                                    });
                                }
                                break;
                            case 'custompath':
                                if (parts.length >= 4) {
                                    batchActions.push({
                                        op: 'customPath',
                                        path: parts[1],
                                        x: parseFloat(parts[2]) || 0.5,
                                        y: parseFloat(parts[3]) || 0.5,
                                        fill: parts[4] || 'transparent',
                                        stroke: parts[5] || '#ffffff',
                                        strokeWidth: parseFloat(parts[6]) || 2,
                                        scale: parseFloat(parts[7]) || 1,
                                        glow: parts[8] === 'true'
                                    });
                                }
                                break;
                            case 'drawdiagram':
                                if (parts.length >= 2) {
                                    const diagramType = parts[1];
                                    const diagramAction = {
                                        op: 'drawDiagram',
                                        type: diagramType,
                                        x: parseFloat(parts[2]) || 0.5,
                                        y: parseFloat(parts[3]) || 0.5
                                    };
                                    // Add type-specific parameters
                                    if (diagramType === 'neuralNetwork' && parts.length > 4) {
                                        diagramAction.layers = parts.slice(4).map(p => parseInt(p)).filter(n => !isNaN(n));
                                    }
                                    batchActions.push(diagramAction);
                                }
                                break;
                        }
                    }
                    if (batchActions.length > 0) {
                        return batchActions;
                    }
                }
                catch (error) {
                    logger_1.logger.debug('[visual] Batch ' + batch + ' retry ' + retry + ' failed: ' + error.message);
                    if (retry >= MAX_RETRIES || error.message.includes('Circuit breaker')) {
                        // NO FALLBACK - fail properly for true generation
                        logger_1.logger.error('[visual] Generation failed - no fallback used');
                        return [];
                    }
                    // Small delay before retry
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            return [];
        })();
        batchPromises.push(batchPromise);
    }
    // Wait for all batches to complete
    const batchResults = await Promise.all(batchPromises);
    // Combine all successful batch results
    for (const batchActions of batchResults) {
        if (batchActions && batchActions.length > 0) {
            allActions.push(...batchActions);
        }
    }
    logger_1.logger.debug('[visual] Generated ' + allActions.length + ' visuals for step ' + step.id);
    // DEBUG: Log operation types
    const opTypes = new Set(allActions.map(a => a.op));
    logger_1.logger.debug('[visual] Operation types: ' + Array.from(opTypes).join(', '));
    if (allActions.length === 0) {
        // NO FALLBACK - return null to trigger retry in codegen
        logger_1.logger.error('[visual] No content generated - failing properly for retry');
        return null;
    }
    // VALIDATION & ENFORCEMENT: Ensure critical operations are present
    // NOTE: These checks disabled for V1, V2 handles this better
    const hasLatex = false; // allActions.some(a => a.op === 'latex');
    const hasDiagram = false; // allActions.some(a => a.op === 'anatomy' || a.op === 'molecule' || a.op === 'neuralNetwork');
    // If math topic but NO LaTeX, inject one
    if (requiresLatex && !hasLatex && step.tag !== 'hook') {
        logger_1.logger.warn('[visual] Math topic missing LaTeX - injecting equation');
        // Find a good insertion point (after title, before summary)
        const insertIndex = allActions.findIndex(a => a.op === 'drawTitle') + 2 || 3;
        // Inject contextual LaTeX based on topic
        let equation = 'f(x) = x';
        if (topicLower.includes('derivative'))
            equation = '\\\\frac{dy}{dx} = \\\\lim_{h \\\\to 0} \\\\frac{f(x+h) - f(x)}{h}';
        else if (topicLower.includes('integral'))
            equation = '\\\\int_a^b f(x) dx';
        else if (topicLower.includes('pythagorean'))
            equation = 'a^2 + b^2 = c^2';
        else if (topicLower.includes('euler'))
            equation = 'e^{i\\\\pi} + 1 = 0';
        else if (topicLower.includes('fourier'))
            equation = 'f(t) = \\\\sum_{n=-\\\\infty}^{\\\\infty} c_n e^{i n \\\\omega t}';
        allActions.splice(insertIndex, 0, {
            op: 'latex',
            equation,
            x: 0.5,
            y: 0.3,
            size: 28,
            color: '#3498db',
            animated: true
        });
        logger_1.logger.info('[visual] Injected LaTeX equation: ' + equation);
    }
    // If anatomy/biology topic but NO diagram, inject one
    if (requiresDiagram && !hasDiagram && step.tag !== 'hook') {
        logger_1.logger.warn('[visual] Anatomy/biology topic missing diagram - injecting structure');
        const insertIndex = allActions.findIndex(a => a.op === 'drawTitle') + 2 || 3;
        let diagramType = 'molecule';
        let diagramLabel = 'Molecular structure';
        if (topicLower.includes('neuron') || topicLower.includes('brain')) {
            diagramType = 'neuralNetwork';
            diagramLabel = 'Neural network structure';
        }
        else if (topicLower.includes('heart')) {
            diagramType = 'anatomy';
            diagramLabel = 'Heart structure';
        }
        // Add simple diagram representation as circles and vectors
        allActions.splice(insertIndex, 0, {
            op: 'drawLabel',
            text: diagramLabel,
            x: 0.5,
            y: 0.25,
            color: '#00ff88',
            fontSize: 20
        }, {
            op: 'drawCircle',
            x: 0.4,
            y: 0.4,
            radius: 0.08,
            color: '#3498db',
            fill: true
        }, {
            op: 'drawCircle',
            x: 0.6,
            y: 0.4,
            radius: 0.08,
            color: '#e74c3c',
            fill: true
        }, {
            op: 'drawVector',
            x1: 0.48,
            y1: 0.4,
            x2: 0.52,
            y2: 0.4,
            color: '#00ff88',
            label: 'connection'
        });
        logger_1.logger.info('[visual] Injected diagram structure');
    }
    // Re-log after injection
    const finalOpTypes = new Set(allActions.map(a => a.op));
    logger_1.logger.debug('[visual] Final operation types: ' + Array.from(finalOpTypes).join(', '));
    return {
        type: 'visuals',
        stepId: step.id,
        actions: allActions
    };
}
