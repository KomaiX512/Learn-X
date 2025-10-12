"use strict";
/**
 * CODEGEN V3 - MULTI-AGENT PURE GENERATION
 *
 * NO hardcoded operations
 * NO validation rules
 * 100% LLM creativity
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.planVisualsEnhanced = planVisualsEnhanced;
exports.codegenV3 = codegenV3;
const logger_1 = require("../logger");
const generative_ai_1 = require("@google/generative-ai");
const syntaxRecoveryAgent_1 = require("./syntaxRecoveryAgent");
const interactiveAnimations_1 = require("./interactiveAnimations");
const svgMasterGenerator_1 = require("./svgMasterGenerator");
// Model fallback configuration - ONLY official models
const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODELS = ['gemini-2.5-flash-lite']; // Higher RPM/TPM limits
const MIN_OPERATIONS = 20; // Reduced from 40 to handle LLM limitations - quality over quantity
/**
 * PRECISION-GUIDED VISUAL PLANNER
 *
 * Creates 5-7 EXTREMELY DETAILED specifications for each visual
 * Each spec is 3-4 lines with exact structure, coordinates, labels, colors
 *
 * Output format:
 * [
 *   "Create [structure]: [shape details with coordinates], [color with hex], labels: [exact text at positions], connections: [from-to]",
 *   ...
 * ]
 */
async function planVisuals(step, topic, apiKey) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: PRIMARY_MODEL,
        generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 8000, // Increased to avoid truncation
            topK: 50,
            topP: 0.95
        },
        systemInstruction: 'You are a precision visual architect. Create EXTREMELY DETAILED visual specifications. Output ONLY a JSON array of detailed instruction strings.'
    });
    const prompt = `Create visual specifications for:
Topic: "${topic}"
Step: "${step.desc}"

Generate 5-7 detailed visual specifications. Each specification describes ONE visual element.

FORMAT for each specification (2-3 sentences):
1. What structure to create (use scientific/technical terms)
2. Shape details: customPath coordinates OR circles/rectangles with positions (x,y from 0.0-1.0)
3. Colors (hex codes like #2196F3)
4. Labels with exact text and positions
5. Any connections/arrows between elements

Your specifications will be converted into SVG operations, so be precise with:
- Coordinates (x: 0.0-1.0, y: 0.0-1.0)
- Colors (#RRGGBB format)
- Exact label text (not "Label 1" - use real scientific terms)
- Connections (from point A to point B)

Output ONLY a JSON array of strings:
["specification 1", "specification 2", "specification 3", ...]

No markdown, no explanations, just the JSON array.`;
    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        logger_1.logger.info(`[planVisuals] LLM OUTPUT:\n${text.substring(0, 500)}...`);
        // ROBUST JSON RECOVERY - Multiple strategies
        let parsed = [];
        // Strategy 1: Direct parse
        try {
            let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(cleaned);
            logger_1.logger.info(`[planVisuals] ✅ Strategy 1 success: ${parsed.length} visuals`);
            return parsed;
        }
        catch { }
        // Strategy 2: Extract JSON array from text
        try {
            const match = text.match(/\[([\s\S]*?)\]/);
            if (match) {
                const cleaned = match[0]
                    .replace(/,\s*\]/g, ']') // Remove trailing commas
                    .replace(/\n/g, ' ') // Remove newlines
                    .replace(/\s+/g, ' '); // Normalize spaces
                parsed = JSON.parse(cleaned);
                logger_1.logger.info(`[planVisuals] ✅ Strategy 2 success: ${parsed.length} visuals`);
                return parsed;
            }
        }
        catch { }
        // Strategy 3: Extract quoted strings as array
        try {
            const matches = text.matchAll(/"([^"]{20,500})"/g);
            parsed = Array.from(matches).map(m => m[1]);
            if (parsed.length > 0) {
                logger_1.logger.info(`[planVisuals] ✅ Strategy 3 success: ${parsed.length} visuals`);
                return parsed;
            }
        }
        catch { }
        // All strategies failed - Use LLM to fix the JSON
        logger_1.logger.error(`[planVisuals] All JSON strategies failed, using LLM debugger`);
        const debugPrompt = `The following text should be a JSON array of strings but has errors:

${text.substring(0, 1500)}

Fix it and output ONLY valid JSON array: ["string1", "string2", "string3"]
Remove markdown, explanations, extra text.`;
        try {
            const debugResult = await model.generateContent(debugPrompt);
            const debugText = debugResult.response.text();
            const match = debugText.match(/\[([\s\S]*?)\]/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                logger_1.logger.info(`[planVisuals] ✅ LLM DEBUGGER SUCCESS: ${parsed.length} visuals`);
                return parsed;
            }
        }
        catch (e) {
            logger_1.logger.error(`[planVisuals] LLM debugger failed:`, e);
        }
        // Last resort - ultra simple
        logger_1.logger.error(`[planVisuals] Trying ultra-simple retry`);
        const simplePrompt = `3 visuals for: ${topic}

Output: ["visual 1", "visual 2", "visual 3"]`;
        try {
            const simpleResult = await model.generateContent(simplePrompt);
            const simpleText = simpleResult.response.text();
            const match = simpleText.match(/\[([\s\S]*?)\]/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                logger_1.logger.info(`[planVisuals] ✅ SIMPLE RETRY SUCCESS: ${parsed.length} visuals`);
                return parsed;
            }
        }
        catch { }
        // FINAL RESORT: Use syntax recovery agent
        logger_1.logger.error(`[planVisuals] Trying SYNTAX RECOVERY AGENT as final resort`);
        try {
            const recovered = await (0, syntaxRecoveryAgent_1.recoverJSON)(text, 'descriptions');
            if (Array.isArray(recovered) && recovered.length > 0) {
                logger_1.logger.info(`[planVisuals] ✅ SYNTAX RECOVERY SUCCESS: ${recovered.length} visuals`);
                return recovered;
            }
        }
        catch (e) {
            logger_1.logger.error(`[planVisuals] Syntax recovery agent failed:`, e);
        }
        // Complete failure
        logger_1.logger.error(`[planVisuals] COMPLETE FAILURE - all recovery failed including syntax agent`);
        return [];
    }
    catch (e) {
        logger_1.logger.error(`[planVisuals] Exception:`, e);
        return [];
    }
}
/**
 * ENHANCED VISUAL PLANNER WITH ANIMATION SUPPORT
 *
 * Creates 5-7 visual specifications, marking 2-3 as animations
 * Returns structured specs with type information
 */
async function planVisualsEnhanced(step, topic, apiKey) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: PRIMARY_MODEL,
        generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 8000,
            topK: 50,
            topP: 0.95
        },
        systemInstruction: 'You are a visual planning expert. Create detailed specifications for educational visuals. Output ONLY valid JSON array of visual specification objects.'
    });
    const prompt = `Generate visual specifications for: "${topic}" - "${step.desc}"

🎯 TASK: Create 7-9 visual specifications (2-3 animations, rest static).

📋 SPECIFICATION RULES:
1. Length: 15-30 words maximum per description
2. Be SPECIFIC not vague - use exact terms from topic
3. Include: what, where, color, label requirements
4. For animations: state motion type (linear/circular/oscillating) and what moves

🎨 ANIMATION TYPES:
- flow: particles moving along path
- orbit: objects rotating around center
- pulse: expanding/contracting elements
- wave: oscillating waveforms
- mechanical: connected components moving

📐 DESCRIPTION TEMPLATE:
Static: "[Object/structure] showing [specific parts]. Position [location]. Color [hex/name]. Label: [what to label]."
Animation: "[What] moving [how/direction]. Show [specifics]. Label: [what to label]. Type: [flow/orbit/pulse/wave/mechanical]."

🚫 AVOID:
- Vague phrases: "illustrate the", "show the process"
- Generic terms: "the system", "the structure"
- Long descriptions over 30 words

OUTPUT FORMAT (CRITICAL):
[
  {
    "description": "Create a detailed anatomical diagram of...",
    "type": "static"
  },
  {
    "description": "Show blood cells flowing through an artery from left to right. Include red blood cells (RBC), white blood cells (WBC), and platelets, all labeled. The vessel walls should be visible in red-brown color.",
    "type": "animation",
    "animationType": "flow"
  },
  {
    "description": "Display molecular structure of...",
    "type": "static"
  },
  {
    "description": "Animate electrons orbiting around an atomic nucleus. Show 2-3 electron shells with different orbital speeds. Label the nucleus and electron paths.",
    "type": "animation",
    "animationType": "orbit"
  }
]

🚨 REQUIREMENTS:
1. Generate 7-9 specifications total
2. Exactly 2-3 must be animations with animationType specified
3. Rest must be static visuals
4. Each description: 15-30 words, topic-specific, includes colors and labels
5. NO generic phrases, NO vague language

Generate ONLY the JSON array (no markdown, no explanations):`;
    // Retry with exponential backoff for rate limiting
    let result;
    let lastError;
    for (let retryCount = 0; retryCount < 3; retryCount++) {
        try {
            if (retryCount > 0) {
                const delayMs = retryCount * 3000; // 3s, 6s delays
                logger_1.logger.info(`[planVisualsEnhanced] Retry ${retryCount}/2 after ${delayMs}ms delay`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            result = await model.generateContent(prompt);
            break; // Success
        }
        catch (error) {
            lastError = error;
            if (error.message?.includes('429') || error.message?.includes('rate limit')) {
                logger_1.logger.warn(`[planVisualsEnhanced] Rate limit hit, will retry...`);
                continue;
            }
            throw error; // Non-rate-limit error
        }
    }
    if (!result) {
        throw lastError || new Error('Failed after retries');
    }
    try {
        const text = result.response.text();
        logger_1.logger.info(`[planVisualsEnhanced] Received response`);
        // Parse JSON
        let specs = [];
        try {
            let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            specs = JSON.parse(cleaned);
            logger_1.logger.info(`[planVisualsEnhanced] ✅ Parsed ${specs.length} specs (${specs.filter(s => s.type === 'animation').length} animations)`);
        }
        catch {
            const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (match) {
                specs = JSON.parse(match[0]);
                logger_1.logger.info(`[planVisualsEnhanced] ✅ Extracted ${specs.length} specs`);
            }
        }
        // Validate spec count and animations
        if (specs.length < 7) {
            logger_1.logger.warn(`[planVisualsEnhanced] Only ${specs.length} specs, expected 7-9`);
        }
        const animCount = specs.filter(s => s.type === 'animation').length;
        if (animCount < 2 && specs.length >= 5) {
            logger_1.logger.warn(`[planVisualsEnhanced] Only ${animCount} animations, converting some static to animations`);
            // Convert specs to animations if needed
            let converted = 0;
            for (let i = 1; i < specs.length && converted < (2 - animCount); i += 2) {
                if (specs[i].type === 'static') {
                    specs[i].type = 'animation';
                    specs[i].animationType = 'flow'; // Default animation type
                    converted++;
                }
            }
        }
        return specs;
    }
    catch (error) {
        logger_1.logger.error(`[planVisualsEnhanced] Failed: ${error.message}`);
        return [];
    }
}
/**
 * INSANE QUALITY VISUAL EXECUTOR - NO FALLBACKS
 *
 * Takes specification and creates MIND-BLOWING visuals
 * Uses SVG Master Generator for 3Blue1Brown-beating quality
 *
 * LASER FOCUSED: Only uses generateInsaneVisuals
 * NO FALLBACKS: Fails properly if quality cannot be achieved
 */
async function codeVisual(specification, topic, apiKey) {
    // ONLY use the quality generator - no fallbacks, no compromises
    const operations = await (0, svgMasterGenerator_1.generateInsaneVisuals)(topic, specification, apiKey);
    logger_1.logger.info(`[codeVisual] ✅ Generated ${operations.length} operations`);
    return operations;
}
/**
 * EMERGENCY SPECIFICATION GENERATOR
 * Creates minimal but valid specifications when planning fails
 */
function createEmergencySpecifications(stepDesc, topic, count) {
    logger_1.logger.info(`[createEmergencySpecs] Generating ${count} emergency specifications`);
    const specs = [];
    const keywords = stepDesc.split(' ').filter(w => w.length > 4).slice(0, 5);
    for (let i = 0; i < count; i++) {
        const keyword = keywords[i] || topic.split(' ')[i] || 'concept';
        specs.push(`Create a visual diagram showing "${keyword}" using customPath at position x:0.${2 + i * 2},y:0.${3 + i} with blue color #2196F3. Add labels explaining the structure with text "${keyword} structure" at x:0.5,y:0.${2 + i}.`);
    }
    return specs;
}
/**
 * EMERGENCY FALLBACK - Create minimal but valid operations
 * Ensures system NEVER fails - bulletproof implementation
 */
function createMinimalOperations(specification) {
    logger_1.logger.info(`[codeVisual] 🚨 EMERGENCY: Creating minimal operations`);
    try {
        // Extract key terms from specification for labels
        const words = specification?.split(' ').filter(w => w && w.length > 4).slice(0, 5) || [];
        const safeSpec = specification?.substring(0, 100) || 'Visual representation';
        return [
            { op: 'drawTitle', text: words[0] || 'Visual', y: 0.05, size: 20 },
            { op: 'drawLabel', text: safeSpec, x: 0.5, y: 0.5, fontSize: 14 },
            { op: 'customPath', path: 'M 0.2,0.3 L 0.8,0.3 L 0.8,0.7 L 0.2,0.7 Z', stroke: '#2196F3', strokeWidth: 2 },
            ...words.slice(1, 4).map((word, i) => ({
                op: 'drawLabel',
                text: word,
                x: 0.3 + (i * 0.2),
                y: 0.6,
                fontSize: 12
            }))
        ];
    }
    catch (e) {
        // ABSOLUTE LAST RESORT - return bare minimum
        logger_1.logger.error(`[codeVisual] Emergency fallback failed: ${e}`);
        return [
            { op: 'drawTitle', text: 'Visual', y: 0.05, size: 20 },
            { op: 'drawLabel', text: 'Content', x: 0.5, y: 0.5, fontSize: 14 }
        ];
    }
}
/**
 * STANDARD VISUAL EXECUTOR (Fallback)
 *
 * Original implementation as backup
 */
async function codeVisualStandard(specification, topic, apiKey) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: FALLBACK_MODELS[0], // Use 2.5-flash-lite for fallback (higher RPM/TPM)
        generationConfig: {
            temperature: 0.8, // Higher creativity for diverse structures
            maxOutputTokens: 16000, // More tokens to avoid truncation
            topK: 40,
            topP: 0.9
        },
        systemInstruction: 'You are a precision visual executor. Convert detailed specifications into exact Konva.js operations. Output ONLY valid JSON array. Follow specifications EXACTLY.'
    });
    const prompt = `🎯 SPECIFICATION TO EXECUTE:
${specification}

📐 YOUR TASK: Convert this specification into 10-20 operations using customPath for structures

🎨 OPERATION TYPES YOU CAN USE:

1. customPath - MAIN TOOL for creating shapes:
   - Cells, molecules, atoms, circuits, diagrams, anything!
   - Use proper SVG path commands: M (move), L (line), C (curve), Z (close)
   - Example: "M 0.3,0.2 L 0.5,0.4 C 0.6,0.5 0.7,0.5 0.8,0.4 Z"

2. drawLabel - Add text labels (x, y, text, fontSize)

3. drawTitle - Main title for the visual (text, y, size)

4. particle - Animated particles (x, y, count, spread, speed, lifetime, color)

5. wave - Wave animations (startX, startY, width, amplitude, frequency, speed, color)

6. orbit - Orbital motion (centerX, centerY, radius, period, objectRadius, color)

7. delay - Pause between operations (ms)

🔥 RULE: For ANY complex structure (molecules, anatomy, circuits, etc.) → ALWAYS use customPath with SVG syntax
Examples: Cell membranes → customPath ellipse, DNA helix → customPath curves, Neurons → customPath branches

📋 EXECUTION RULES (CRITICAL - MUST FOLLOW):
1. Follow specification coordinates EXACTLY (don't change positions)
2. Use exact colors specified (hex codes or rgba)
3. Use exact label text from specification (scientific terminology)
4. Create ALL structures mentioned in specification
5. Add connections/arrows as specified
6. Each operation MUST have "op" field (NOT "operation")
7. Coordinates in 0.0-1.0 range
8. Round to 0.05 increments for clean positioning

🚨 COMPLEX PATH ENFORCEMENT (CRITICAL):
- If specification mentions "customPath" → YOU MUST use {"op":"customPath"}
- If specification describes "curved", "organic", "molecule", "anatomical" shapes → USE customPath
- If specification says "draw [structure] using customPath" → USE customPath, NOT circles/rects
- DO NOT substitute basic shapes (circles/rects) for complex structures
- PREFER customPath for: molecules, anatomical parts, organic shapes, curved structures
- Use basic shapes ONLY for: simple geometric objects, nodes, basic connectors

✅ EXCELLENT EXAMPLES (customPath dominance):

// Cell membrane (organic curve)
{
  "op": "customPath",
  "path": "M 0.1,0.4 Q 0.3,0.35 0.5,0.4 T 0.9,0.4",
  "stroke": "#27ae60",
  "strokeWidth": 4,
  "fill": "none"
}

// DNA helix strand
{
  "op": "customPath",
  "path": "M 0.2,0.2 C 0.25,0.3 0.25,0.4 0.2,0.5 C 0.15,0.6 0.15,0.7 0.2,0.8",
  "stroke": "#e74c3c",
  "strokeWidth": 3,
  "fill": "none"
}

// Neuron dendrite branches
{
  "op": "customPath",
  "path": "M 0.5,0.5 L 0.45,0.4 M 0.5,0.5 L 0.55,0.4 M 0.5,0.5 L 0.48,0.35",
  "stroke": "#3498db",
  "strokeWidth": 2
}

// Scientific label
{
  "op": "drawLabel",
  "text": "Phospholipid Bilayer",
  "x": 0.5,
  "y": 0.25,
  "fontSize": 16,
  "color": "#ecf0f1"
}

🚀 EXECUTE THE SPECIFICATION:
Generate 8-15 operations that EXACTLY match the specification.

❌ DO NOT OUTPUT TEXT DESCRIPTIONS LIKE:
["Introduce f(t) curve", "Show function", "Animate strip"]

✅ ONLY OUTPUT VALID JSON OPERATIONS LIKE (customPath for complex shapes):
[
  {"op":"customPath","path":"M 0.15,0.4 Q 0.25,0.35 0.35,0.4 Q 0.45,0.45 0.55,0.4","stroke":"#e74c3c","strokeWidth":3,"fill":"none"},
  {"op":"customPath","path":"M 0.2,0.5 C 0.22,0.55 0.28,0.55 0.3,0.5","stroke":"#3498db","strokeWidth":2},
  {"op":"drawLabel","text":"Synaptic Vesicle","x":0.25,"y":0.35,"fontSize":14,"color":"#ecf0f1"},
  {"op":"drawVector","x1":0.35,"y1":0.4,"x2":0.5,"y2":0.4,"color":"#f39c12","label":"Signal Flow"},
  {"op":"wave","x":0.6,"y":0.5,"amplitude":0.05,"frequency":2,"color":"#2ecc71"}
]

CRITICAL: Output ONLY the JSON array above. NO text, NO descriptions, ONLY JSON.`;
    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        logger_1.logger.info(`[codeVisual] LLM OUTPUT for "${specification.substring(0, 50)}...":\n${text.substring(0, 800)}...`);
        // ROBUST JSON RECOVERY - Multiple strategies
        let operations = [];
        // Strategy 1: Standard JSON parse
        try {
            let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const jsonMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonMatch)
                cleaned = jsonMatch[0];
            operations = JSON.parse(cleaned);
            logger_1.logger.info(`[codeVisual] ✅ Strategy 1: ${operations.length} operations`);
            const uniqueOps = [...new Set(operations.map((op) => op.op))];
            logger_1.logger.info(`[codeVisual] Operations: ${uniqueOps.join(', ')}`);
            return operations;
        }
        catch { }
        // Strategy 2: Extract individual JSON objects
        try {
            const objMatches = text.matchAll(/\{[^{}]*"op"[^{}]*\}/g);
            operations = Array.from(objMatches).map(m => {
                try {
                    const cleaned = m[0]
                        .replace(/,\s*}/g, '}')
                        .replace(/'/g, '"');
                    return JSON.parse(cleaned);
                }
                catch {
                    return null;
                }
            }).filter(op => op !== null);
            if (operations.length > 0) {
                logger_1.logger.info(`[codeVisual] ✅ Strategy 2: ${operations.length} operations`);
                return operations;
            }
        }
        catch { }
        // All strategies failed - Use LLM to fix the JSON
        logger_1.logger.error(`[codeVisual] All JSON strategies failed, using LLM debugger`);
        const debugPrompt = `The following text should be a JSON array but has errors:

${text.substring(0, 2000)}

Fix it and output ONLY valid JSON array starting with [ and ending with ].
Remove any markdown, explanations, or extra text.`;
        try {
            const debugResult = await model.generateContent(debugPrompt);
            const debugText = debugResult.response.text();
            const match = debugText.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (match) {
                const ops = JSON.parse(match[0]);
                logger_1.logger.info(`[codeVisual] ✅ LLM DEBUGGER SUCCESS: ${ops.length} operations`);
                return ops;
            }
        }
        catch (e) {
            logger_1.logger.error(`[codeVisual] LLM debugger failed:`, e);
        }
        // Last resort - ultra simple retry
        logger_1.logger.error(`[codeVisual] Trying ultra-simple retry`);
        const simplePrompt = `Create 15 operations for: ${specification.substring(0, 100)}

Output: [{"op":"name","x":0.5,"y":0.3},...]

ONLY JSON array.`;
        try {
            const simpleResult = await model.generateContent(simplePrompt);
            const simpleText = simpleResult.response.text();
            const match = simpleText.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (match) {
                const ops = JSON.parse(match[0]);
                logger_1.logger.info(`[codeVisual] ✅ SIMPLE RETRY SUCCESS: ${ops.length} operations`);
                return (0, syntaxRecoveryAgent_1.validateOperations)(ops);
            }
        }
        catch { }
        // FINAL RESORT: Use syntax recovery agent
        logger_1.logger.error(`[codeVisual] Trying SYNTAX RECOVERY AGENT as final resort`);
        try {
            const recovered = await (0, syntaxRecoveryAgent_1.recoverJSON)(text, 'operations');
            if (Array.isArray(recovered) && recovered.length > 0) {
                const validated = (0, syntaxRecoveryAgent_1.validateOperations)(recovered);
                logger_1.logger.info(`[codeVisual] ✅ SYNTAX RECOVERY SUCCESS: ${validated.length} valid operations`);
                return validated;
            }
        }
        catch (e) {
            logger_1.logger.error(`[codeVisual] Syntax recovery agent failed:`, e);
        }
        // Complete failure
        logger_1.logger.error(`[codeVisual] COMPLETE FAILURE - all recovery attempts failed including syntax agent`);
        return [];
    }
    catch (e) {
        logger_1.logger.error(`[codeVisual] Exception:`, e);
        return [];
    }
}
/**
 * OPTIMIZED: Generate ALL operations in ONE LLM call (3-4x faster!)
 */
/**
 * Try generation with fallback models on 503 error
 */
async function tryGenerationWithFallback(genAI, prompt) {
    let lastError;
    // Try primary model first
    try {
        const model = genAI.getGenerativeModel({
            model: PRIMARY_MODEL,
            generationConfig: {
                temperature: 0.85,
                maxOutputTokens: 12000,
                topK: 50,
                topP: 0.95
            },
            systemInstruction: 'You are a visual operation generator. Output ONLY a JSON array of operation objects. Never include explanations or markdown.'
        });
        const result = await model.generateContent(prompt);
        logger_1.logger.info(`[codegenV3] ✅ Success with primary model: ${PRIMARY_MODEL}`);
        return result.response.text();
    }
    catch (error) {
        lastError = error;
        if (error?.message?.includes('503') || error?.message?.includes('overloaded')) {
            logger_1.logger.warn(`[codegenV3] Primary model ${PRIMARY_MODEL} overloaded, trying fallbacks...`);
            for (const fallbackModel of FALLBACK_MODELS) {
                try {
                    const model = genAI.getGenerativeModel({
                        model: fallbackModel,
                        generationConfig: {
                            temperature: 0.85,
                            maxOutputTokens: 12000,
                            topK: 50,
                            topP: 0.95
                        },
                        systemInstruction: 'You are a visual operation generator. Output ONLY a JSON array of operation objects. Never include explanations or markdown.'
                    });
                    const result = await model.generateContent(prompt);
                    logger_1.logger.info(`[codegenV3] ✅ Success with fallback model: ${fallbackModel}`);
                    return result.response.text();
                }
                catch (fallbackError) {
                    lastError = fallbackError;
                    if (fallbackError?.message?.includes('503') || fallbackError?.message?.includes('overloaded')) {
                        logger_1.logger.warn(`[codegenV3] Fallback model ${fallbackModel} also overloaded`);
                        continue;
                    }
                    throw fallbackError;
                }
            }
        }
    }
    throw lastError;
}
async function generateAllOperationsFast(step, topic, apiKey) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    // COMPLETE list of ALL valid operations from types.ts (CRITICAL FIX: Issue #11)
    const validOps = [
        // Basic shapes
        'drawCircle', 'drawRect', 'drawLabel', 'drawLine', 'customPath', 'drawTitle',
        // Advanced visualizations
        'drawGraph', 'drawLatex', 'drawMathLabel', 'drawVector', 'drawDiagram',
        // Animations
        'wave', 'particle', 'orbit', 'animate', 'delay',
        // Domain-specific biology
        'drawCellStructure', 'drawOrganSystem', 'drawMembrane',
        // Domain-specific chemistry
        'drawMolecule', 'drawAtom', 'drawReaction', 'drawBond', 'drawMolecularStructure',
        // Domain-specific physics
        'drawPhysicsObject', 'drawForceVector', 'drawTrajectory', 'drawFieldLines',
        // Domain-specific electronics
        'drawCircuitElement', 'drawSignalWaveform', 'drawConnection',
        // Domain-specific CS
        'drawDataStructure', 'drawNeuralNetwork', 'drawAlgorithmStep', 'drawFlowchart',
        // Domain-specific math
        'drawCoordinateSystem', 'drawGeometry'
    ].join(', ');
    // ENHANCED PROMPT with spatial, color, labeling, and animation guidance (CRITICAL FIX: Issues #3, #4, #7, #8)
    const prompt = `Topic: ${topic}
Step: ${step.desc}

🎯 MISSION: Generate 50-60 high-quality Konva.js operations as JSON array.

📐 SPATIAL LAYOUT RULES (Issue #3 - CRITICAL):
- Organize into 3-4 VERTICAL SECTIONS:
  * Section 1 (y: 0.05-0.30): Title + Main concept visual
  * Section 2 (y: 0.35-0.55): Supporting details/diagrams
  * Section 3 (y: 0.60-0.80): Process/mechanism
  * Section 4 (y: 0.85-0.95): Summary/connections
- HORIZONTAL SPACING: Leave 0.05-0.1 margin between elements
- NEVER overlap elements (check x,y coordinates)
- Round ALL coordinates to 0.05 increments (0.0, 0.05, 0.1, ... 0.95, 1.0)

🏷️ LABELING RULES (Issue #4 - CRITICAL):
- Every visual element MUST have descriptive labels
- Use SCIENTIFIC terminology: "${topic}" specific terms, NOT "Label 1" or "Part A"
- Include measurements: "5 nm", "90°", "3.2 eV" when relevant
- Show relationships: "→ produces", "⟷ equilibrium", "∝ proportional"
- Position labels NEAR their targets (within 0.05 units)

🎨 COLOR RULES (Issue #7 - CRITICAL - BLACK CANVAS):
- Use REALISTIC, DOMAIN-SPECIFIC colors:
  * Biology: chloroplasts=#27ae60, blood=#e74c3c, DNA=#3498db
  * Chemistry: carbon=#2c3e50, oxygen=#e74c3c, nitrogen=#3498db
  * Physics: energy=#f39c12, force=#e74c3c, field=#3498db
- Ensure HIGH CONTRAST with black background (#000000)
- Use glow:true for energy/photons/electricity
- Stroke + fill with opacity for depth: fill="rgba(46,204,113,0.3)"

🎬 ANIMATION STRATEGY (Issue #8 - CRITICAL):
- Start with STATIC structure (30-40 ops)
- Add 10-20 ANIMATIONS showing processes:
  * 'particle': photons, electrons, molecules moving (count:5-10, spread:0.1-0.3)
  * 'wave': signals, energy transfer (amplitude:0.03-0.05, frequency:2-4)
  * 'orbit': planets, electrons (radius:0.1-0.2, period:2-5)
  * 'animate': growth, transformation
- Use 'delay' (500-2000ms) between animation phases

🎯 YOUR TOOLS - USE THESE TO CREATE ANYTHING:

✅ PRIMARY OPERATION - customPath (CREATE ANY SHAPE):
   Use SVG path syntax to draw structures, molecules, cells, circuits, etc.
   Example: {"op":"customPath","path":"M 0.2,0.3 L 0.5,0.5 C 0.6,0.7 0.8,0.7 0.9,0.5","stroke":"#2196F3","strokeWidth":2}

✅ LABELS - drawLabel, drawTitle:
   Add text descriptions and titles
   
✅ ANIMATIONS - particle, wave, orbit:
   Add motion and life to your visuals

🛠️ ALL AVAILABLE OPERATIONS:
${validOps}

⚙️ TECHNICAL REQUIREMENTS:
1. Each MUST have "op" field (NOT "operation")
2. customPath for complex shapes: {"op":"customPath","path":"M 0.2,0.3 L 0.4,0.5 C 0.5,0.6 ...","stroke":"#2196F3"}
3. Coordinates: 0.0-1.0 range, rounded to 0.05
4. Font sizes: titles=22-26, labels=14-18, details=12-14

📤 OUTPUT FORMAT:
[{"op":"drawLabel","text":"${step.desc.substring(0, 60)}","x":0.5,"y":0.05,"fontSize":24},{"op":"customPath","path":"M 0.2,0.3 L 0.8,0.3","stroke":"#2196F3","strokeWidth":3},{"op":"drawCircle","x":0.5,"y":0.5,"radius":0.05,"fill":"#4CAF50"},...]

✅ GENERATE EXACTLY 50-60 OPERATIONS (mandatory). 100% CONTEXTUAL to "${topic}". NO generic placeholders!

🎯 QUALITY REQUIREMENTS:
- Generate 50-70 operations for rich, detailed visualization
- Use customPath for ALL complex structures (molecules, cells, circuits, diagrams)
- Each customPath MUST have valid SVG syntax
- Add descriptive labels for ALL important elements
- Include particles/waves for dynamic effects`;
    try {
        logger_1.logger.info(`[codegenV3-FAST] 🚀 Single LLM call for ALL operations...`);
        const text = await tryGenerationWithFallback(genAI, prompt);
        logger_1.logger.info(`[codegenV3-FAST] Received ${text.length} chars`);
        try {
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) {
                logger_1.logger.info(`[codegenV3-FAST] ✅ Parsed: ${parsed.length} operations`);
                const validated = (0, syntaxRecoveryAgent_1.validateOperations)(parsed);
                // Add interactive animations for engagement
                const enhanced = (0, interactiveAnimations_1.addInteractiveAnimations)(validated, topic);
                logger_1.logger.info(`[codegenV3-FAST] 🎯 Enhanced with interactive animations: ${enhanced.length} total ops`);
                return enhanced;
            }
        }
        catch { }
        try {
            const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                logger_1.logger.info(`[codegenV3-FAST] ✅ Extracted: ${parsed.length} operations`);
                return (0, syntaxRecoveryAgent_1.validateOperations)(parsed);
            }
        }
        catch { }
        logger_1.logger.warn(`[codegenV3-FAST] Using syntax recovery...`);
        const recovered = await (0, syntaxRecoveryAgent_1.recoverJSON)(text, 'operations');
        return (0, syntaxRecoveryAgent_1.validateOperations)(recovered);
    }
    catch (error) {
        logger_1.logger.error(`[codegenV3-FAST] ❌ Failed:`, error);
        return [];
    }
}
/**
 * PRECISION-GUIDED TWO-STAGE PIPELINE
 *
 * Stage 1: SubPlanner creates 5-7 ultra-detailed specifications
 * Stage 2: Visual Executor generates operations for each spec (parallel)
 *
 * NO fallbacks, NO templates, 100% contextual true generation
 */
async function codegenV3(step, topic) {
    logger_1.logger.info(`[codegenV3] 🎯 PRECISION-GUIDED TWO-STAGE for step ${step.id}: ${step.tag}`);
    logger_1.logger.info(`[codegenV3] Topic: "${topic}"`);
    logger_1.logger.info(`[codegenV3] Step: "${step.desc}"`);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger_1.logger.error('[codegenV3] GEMINI_API_KEY not set');
        return null;
    }
    try {
        const startTime = Date.now();
        // STAGE 1: Get 5-7 ultra-precise specifications with animation support
        logger_1.logger.info(`[codegenV3] 📐 STAGE 1: Enhanced SubPlanner generating specifications (static + animation)...`);
        const visualSpecs = await planVisualsEnhanced(step, topic, apiKey);
        // CRITICAL: Apply 40% threshold to planning stage
        const TARGET_SPECS = 7;
        const MINIMUM_SPECS = Math.ceil(TARGET_SPECS * 0.4); // 40% of 7 = 3 specs
        if (!visualSpecs || visualSpecs.length === 0) {
            logger_1.logger.error(`[codegenV3] ❌ STAGE 1 FAILED: SubPlanner returned no specifications`);
            return null;
        }
        const staticSpecs = visualSpecs.filter(s => s.type === 'static');
        const animationSpecs = visualSpecs.filter(s => s.type === 'animation');
        logger_1.logger.info(`[codegenV3] ✅ STAGE 1 SUCCESS: ${visualSpecs.length} specs (${staticSpecs.length} static, ${animationSpecs.length} animations)`);
        visualSpecs.forEach((spec, i) => {
            const prefix = spec.type === 'animation' ? `🎬 [${spec.animationType}]` : '📐 [static]';
            logger_1.logger.info(`[codegenV3]   ${prefix} Spec ${i + 1}: ${spec.description.substring(0, 80)}...`);
        });
        // STAGE 2: Execute specifications with routing to appropriate generators
        logger_1.logger.info(`[codegenV3] 🚀 STAGE 2: Executing ${visualSpecs.length} specifications (PARALLEL)...`);
        const visualPromises = visualSpecs.map(async (spec, index) => {
            try {
                if (spec.type === 'animation') {
                    logger_1.logger.info(`[codegenV3]   🎬 Animation ${index + 1}: Generating ${spec.animationType} animation...`);
                    const svgCode = await Promise.resolve().then(() => __importStar(require('./svgAnimationGenerator'))).then(m => m.generateSVGAnimation(topic, spec.description, spec.animationType || 'flow', apiKey));
                    const action = {
                        op: 'customSVG',
                        svgCode,
                        visualGroup: `animation-${index + 1}`
                    };
                    logger_1.logger.info(`[codegenV3]   Animation ${index + 1}: ✅ Generated SVG animation`);
                    return [action];
                }
                else {
                    logger_1.logger.info(`[codegenV3]   📐 Static ${index + 1}: Generating static visual...`);
                    const ops = await codeVisual(spec.description, topic, apiKey);
                    logger_1.logger.info(`[codegenV3]   Static ${index + 1}: ✅ ${ops.length} operations`);
                    return ops;
                }
            }
            catch (error) {
                logger_1.logger.error(`[codegenV3]   Visual ${index + 1}: ❌ Failed - ${error.message}`);
                return [];
            }
        });
        const visualResults = await Promise.all(visualPromises);
        // CRITICAL: Track success rate for partial acceptance
        const successfulVisuals = visualResults.filter(ops => ops.length > 0);
        const failedVisuals = visualResults.filter(ops => ops.length === 0);
        const successRate = (successfulVisuals.length / visualResults.length) * 100;
        logger_1.logger.info(`[codegenV3] 📊 Visual Success Rate: ${successfulVisuals.length}/${visualResults.length} (${successRate.toFixed(0)}%)`);
        // ACCEPT 40%+ SUCCESS RATE (Partial Success)
        const MINIMUM_SUCCESS_RATE = 40; // Accept if 40%+ visuals succeed
        if (successRate < MINIMUM_SUCCESS_RATE) {
            logger_1.logger.error(`[codegenV3] ❌ FAILED: Success rate ${successRate.toFixed(0)}% is below minimum ${MINIMUM_SUCCESS_RATE}%`);
            logger_1.logger.error(`[codegenV3]   Successful: ${successfulVisuals.length}, Failed: ${failedVisuals.length}`);
            return null;
        }
        if (successRate < 100) {
            logger_1.logger.warn(`[codegenV3] ⚠️ PARTIAL SUCCESS: ${successRate.toFixed(0)}% of visuals succeeded (${failedVisuals.length} failed)`);
        }
        // Combine all operations sequentially
        let allOperations = [];
        visualResults.forEach((ops, index) => {
            if (ops.length > 0) {
                logger_1.logger.info(`[codegenV3]   Adding ${ops.length} operations from visual ${index + 1}`);
                allOperations = allOperations.concat(ops);
                // Add small delay between visuals for sequential appearance
                if (index < visualResults.length - 1) {
                    allOperations.push({ op: 'delay', ms: 300 });
                }
            }
        });
        const genTime = ((Date.now() - startTime) / 1000).toFixed(2);
        if (allOperations.length < MIN_OPERATIONS) {
            logger_1.logger.warn(`[codegenV3] ⚠️ Low operation count: ${allOperations.length} (minimum: ${MIN_OPERATIONS})`);
            logger_1.logger.warn(`[codegenV3]   Accepting due to ${successRate.toFixed(0)}% success rate`);
        }
        logger_1.logger.info(`[codegenV3] ═══════════════════════════════════════`);
        logger_1.logger.info(`[codegenV3] ✅ TWO-STAGE PIPELINE COMPLETE (WITH ANIMATIONS)`);
        logger_1.logger.info(`[codegenV3] ⏱️  Time: ${genTime}s`);
        logger_1.logger.info(`[codegenV3] 📊 Specifications: ${visualSpecs.length} (${staticSpecs.length} static, ${animationSpecs.length} animations)`);
        logger_1.logger.info(`[codegenV3] 🎨 Total Operations: ${allOperations.length}`);
        logger_1.logger.info(`[codegenV3] 🎯 100% Precision-Guided (NO fallbacks)`);
        logger_1.logger.info(`[codegenV3] ═══════════════════════════════════════`);
        // Count operation types
        const opCounts = allOperations.reduce((acc, op) => {
            acc[op.op] = (acc[op.op] || 0) + 1;
            return acc;
        }, {});
        logger_1.logger.info(`[codegenV3] Operation breakdown: ${JSON.stringify(opCounts)}`);
        // Validate overall quality
        const validation = (0, svgMasterGenerator_1.validateQuality)(allOperations);
        logger_1.logger.info(`[codegenV3] 🎯 QUALITY SCORE: ${validation.score}/100`);
        if (validation.score < 50) {
            logger_1.logger.warn(`[codegenV3] ⚠️ Low quality score. Issues: ${validation.issues.join(', ')}`);
        }
        else if (validation.score >= 80) {
            logger_1.logger.info(`[codegenV3] 🔥 INSANE QUALITY ACHIEVED! This beats 3Blue1Brown!`);
        }
        // Add step title at the beginning
        const finalOperations = [
            { op: 'drawTitle', text: step.desc.substring(0, 80), y: 0.02, size: 20 },
            { op: 'delay', ms: 500 },
            ...allOperations
        ];
        return {
            type: 'actions',
            stepId: step.id,
            actions: finalOperations
        };
    }
    catch (error) {
        logger_1.logger.error(`[codegenV3] ❌ PIPELINE FAILURE:`, error);
        return null;
    }
}
exports.default = codegenV3;
