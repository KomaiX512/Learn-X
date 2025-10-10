"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textAgent = textAgent;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const MODEL = 'gemini-2.5-flash'; // Highest RPM model
const TIMEOUT = 30000; // 30 seconds for reliable text generation
function withTimeout(p, ms) {
    return Promise.race([
        p,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
    ]);
}
// PURE text generation - MINIMAL labels only
async function textAgent(step, topic) {
    logger_1.logger.debug(`[text] Generating text for step ${step.id}: ${step.desc}`);
    const key = process.env.GEMINI_API_KEY;
    if (!key)
        throw new Error('GEMINI_API_KEY not set');
    const genAI = new generative_ai_1.GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: MODEL });
    // RICH EDUCATIONAL TEXT - 3Blue1Brown style with depth
    const prompt = `Generate RICH EDUCATIONAL TEXT for teaching "${topic}"
Step ${step.id}: ${step.tag} - ${step.desc}

You are creating beautiful, structured text that complements animations.
Generate text that builds understanding progressively.

REQUIRED STRUCTURE for ${step.tag}:
${step.tag === 'hook' ?
        `1. MAIN TITLE: Beautiful, engaging title for the section
2. HOOK QUESTION: Thought-provoking "But why...?" or "What if...?" 
3. CONTEXT: Brief setup of the problem
4. TEASER: Hint at what's coming` :
        step.tag === 'intuition' ?
            `1. SECTION TITLE: "Building Intuition"
2. SIMPLE START: "Let's start with something simple..."
3. KEY OBSERVATION: "Notice how..." with specific insight
4. ANALOGY: Real-world comparison
5. DEFINITION: Clear, simple definition` :
            step.tag === 'formalism' ?
                `1. SECTION TITLE: "The Mathematics"
2. FORMAL DEFINITION: Precise mathematical statement
3. KEY EQUATION: Central formula with LaTeX
4. EXPLANATION: What each part means
5. PROPERTIES: Important characteristics` :
                step.tag === 'exploration' ?
                    `1. SECTION TITLE: "Exploring Further"
2. VARIATION 1: "What happens if we change..."
3. VARIATION 2: "Consider this edge case..."
4. PATTERN: "A pattern emerges..."
5. GENERALIZATION: Broader principle` :
                    `1. SECTION TITLE: "Bringing It Together"
2. SYNTHESIS: How everything connects
3. KEY TAKEAWAY: Main insight
4. APPLICATIONS: Real-world uses
5. NEXT STEPS: Where to go from here`}

OUTPUT FORMAT (JSON array):
[
  {"op":"drawTitle","text":"Beautiful Title Here","y":0.05,"duration":2},
  {"op":"drawLabel","text":"Explanatory text","x":0.5,"y":0.2,"color":"#ffffff","fontSize":18,"isImportant":true},
  {"op":"drawMathLabel","tex":"\\\\frac{d}{dx}f(x)","x":0.5,"y":0.4,"normalized":true},
  {"op":"drawLabel","text":"Definition: ...","x":0.2,"y":0.6,"color":"#FFD700","fontSize":16,"isDefinition":true}
]

GUIDELINES:
- Use drawTitle for main headings (large, gold color)
- Use drawLabel for explanations (white for normal, gold for definitions)
- Use drawMathLabel for ALL mathematical expressions (proper LaTeX)
- Position text thoughtfully (y: 0.05-0.95, avoid overlaps)
- Add isImportant:true for key concepts
- Add isDefinition:true for definitions
- Use fontSize: 20-24 for titles, 16-18 for body, 14 for details

EXAMPLE for "Derivatives":
[
  {"op":"drawTitle","text":"The Instantaneous Rate of Change","y":0.05,"duration":2},
  {"op":"drawLabel","text":"But what does it mean to find the slope at a single point?","x":0.5,"y":0.15,"color":"#00ff88","fontSize":18,"italic":true},
  {"op":"drawLabel","text":"Definition: The derivative measures how fast something changes","x":0.5,"y":0.25,"color":"#FFD700","fontSize":16,"isDefinition":true},
  {"op":"drawMathLabel","tex":"f'(x) = \\\\lim_{h \\\\to 0} \\\\frac{f(x+h)-f(x)}{h}","x":0.5,"y":0.4,"normalized":true},
  {"op":"drawLabel","text":"This limit captures the instantaneous rate of change","x":0.5,"y":0.55,"color":"#ffffff","fontSize":16}
]

Now generate rich text for: "${topic}" - ${step.tag}
OUTPUT ONLY THE JSON ARRAY:`;
    try {
        const res = await withTimeout(model.generateContent(prompt), TIMEOUT);
        let text = res.response.text().trim();
        // Remove markdown code blocks if present
        text = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
        // Remove comments
        text = text.replace(/\/\/.*$/gm, '');
        text = text.replace(/\/\*[\s\S]*?\*\//g, '');
        // Check if it's just an array without wrapper
        if (text.trim().startsWith('[')) {
            // Wrap it in the expected structure
            text = `{"type":"text","actions":${text}}`;
        }
        // Extract JSON
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error(`No JSON found in response: ${text.slice(0, 100)}`);
        }
        text = text.slice(jsonStart, jsonEnd + 1);
        // Simple sanitization
        let jsonText = text;
        jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
        const chunk = JSON.parse(jsonText);
        chunk.stepId = step.id;
        // Validate - must be minimal
        if (chunk.actions.length > 4) {
            chunk.actions = chunk.actions.slice(0, 4); // Enforce maximum
        }
        logger_1.logger.debug(`[text] Generated ${chunk.actions.length} text labels for step ${step.id}`);
        return chunk;
    }
    catch (error) {
        logger_1.logger.error(`[text] Generation failed: ${error}`);
        // NO FALLBACKS - FAIL PROPERLY
        throw error;
    }
}
