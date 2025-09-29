"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textAgent = textAgent;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const MODEL = 'gemini-2.5-flash';
const TIMEOUT = 20000; // 20 seconds for text generation
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
    // ULTRA-SIMPLE TEXT PROMPT - 3Blue1Brown style minimal text
    const prompt = `{"type":"text","actions":[

CRITICAL: OUTPUT ONLY JSON. NO EXPLANATIONS.
TOPIC: ${topic}
STEP: ${step.desc}

Generate STRUCTURED text for ${step.tag}:

${step.tag === 'hook' ?
        `1. TITLE: Clear, engaging title
2. QUESTION: "But why...?" or "What if...?"
3. LABEL: Key observation` :
        step.tag === 'intuition' ?
            `1. LABEL: "Let's start simple"
2. LABEL: "Notice how..."
3. LABEL: Key insight` :
            step.tag === 'formalism' ?
                `1. TITLE: Mathematical concept
2. EQUATION: Key formula
3. LABEL: What it means` :
                step.tag === 'exploration' ?
                    `1. LABEL: "What happens if..."
2. LABEL: Edge case
3. LABEL: Pattern emerges` :
                    `1. TITLE: Big picture
2. LABEL: Connection
3. LABEL: Application`}

Available:
{"op":"drawTitle","text":"Title","x":0.5,"y":0.1,"size":24,"color":"#FFD700"}
{"op":"drawLabel","text":"Label","x":0.5,"y":0.8}
{"op":"drawMathLabel","tex":"equation","x":0.5,"y":0.5}
4. Position text to not overlap (spread out y values)

${step.tag === 'hook' ? 'One title + one key question' :
        step.tag === 'intuition' ? 'Label key concepts only' :
            step.tag === 'formalism' ? 'Show key equation + definition' :
                step.tag === 'exploration' ? 'Label variations briefly' :
                    'Final insight or formula'}

Example:
{"op":"drawTitle","text":"The Derivative","y":0.05,"duration":1},
{"op":"drawMathLabel","tex":"f'(x) = \\\\lim_{h \\\\to 0} \\\\frac{f(x+h)-f(x)}{h}","x":0.5,"y":0.9}

]}`;
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
