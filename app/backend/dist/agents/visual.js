"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visualAgent = visualAgent;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const MODEL = 'gemini-2.5-flash';
const TIMEOUT = 90000; // 90 seconds for visual generation - 40-50 visuals need more time
function withTimeout(p, ms) {
    return Promise.race([
        p,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
    ]);
}
// PURE visual generation - NO text, NO fallbacks
async function visualAgent(step, topic) {
    logger_1.logger.debug(`[visual] Generating visuals for step ${step.id}: ${step.desc}`);
    const key = process.env.GEMINI_API_KEY;
    if (!key)
        throw new Error('GEMINI_API_KEY not set');
    const genAI = new generative_ai_1.GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: MODEL });
    const prompt = `{"type":"visuals","actions":[

CRITICAL: OUTPUT PURE JSON ONLY
TOPIC: ${topic}
STEP: ${step.desc}
STAGE: ${step.tag}

GENERATE EXACTLY 18-22 VISUAL ANIMATIONS:

${step.tag === 'hook' ? 'Create attention-grabbing visuals that draw viewers in' :
        step.tag === 'intuition' ? 'Build understanding with simple, clear visuals' :
            step.tag === 'formalism' ? 'Show mathematical relationships and equations visually' :
                step.tag === 'exploration' ? 'Explore variations, edge cases, and what-ifs' :
                    'Synthesize all concepts into a grand visual finale'}

USE THESE OPERATIONS (mix and vary parameters for ${topic}):
{"op":"drawCircle","x":0.5,"y":0.5,"radius":0.1,"color":"#ff0000","fill":true}
{"op":"drawVector","x1":0.4,"y1":0.5,"x2":0.6,"y2":0.5,"color":"#0000ff"}
{"op":"orbit","centerX":0.5,"centerY":0.5,"radius":0.15,"period":3}
{"op":"wave","startX":0.3,"startY":0.5,"width":0.4,"amplitude":0.1}
{"op":"particle","x":0.5,"y":0.5,"count":20,"spread":0.15}
{"op":"arrow","x":0.5,"y":0.5,"angle":0,"length":0.2}
{"op":"flow","startX":0.3,"startY":0.5,"endX":0.7,"endY":0.5}

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
            text = `{"type":"visuals","actions":${text}}`;
        }
        // Extract JSON
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error(`No JSON found in response: ${text.slice(0, 100)}`);
        }
        text = text.slice(jsonStart, jsonEnd + 1);
        let jsonText = text;
        // Aggressive sanitization
        jsonText = jsonText.replace(/Math\.PI/g, '3.14159');
        jsonText = jsonText.replace(/Math\.E/g, '2.71828');
        jsonText = jsonText.replace(/Math\.sin\([^)]+\)/g, '0');
        jsonText = jsonText.replace(/Math\.cos\([^)]+\)/g, '1');
        jsonText = jsonText.replace(/Math\.random\(\)/g, '0.5');
        jsonText = jsonText.replace(/undefined/g, 'null');
        jsonText = jsonText.replace(/NaN/g, '0');
        jsonText = jsonText.replace(/Infinity/g, '999');
        jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
        jsonText = jsonText.replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Quote unquoted keys
        jsonText = jsonText.replace(/:\s*'([^']*)'/g, ': "$1"'); // Single to double quotes
        const chunk = JSON.parse(jsonText);
        chunk.stepId = step.id;
        // Validate - must have visuals, no text
        const hasText = chunk.actions.some(a => a.op === 'drawLabel' || a.op === 'drawTitle' || a.op === 'drawMathLabel');
        if (hasText) {
            throw new Error('Visual agent generated text - invalid');
        }
        logger_1.logger.debug(`[visual] Generated ${chunk.actions.length} visual actions for step ${step.id}`);
        return chunk;
    }
    catch (error) {
        logger_1.logger.error(`[visual] Generation failed: ${error}`);
        // NO FALLBACKS - TRUE GENERATION ONLY
        throw new Error(`Visual generation failed: ${error}`);
    }
}
