"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codegenAgent = codegenAgent;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT = Number(process.env.LLM_TIMEOUT_MS || 30000);
function withTimeout(p, ms, label) {
    logger_1.logger.debug(`[timeout] Setting ${ms}ms timeout for ${label}`);
    return Promise.race([
        p,
        new Promise((_, reject) => {
            const timer = setTimeout(() => {
                logger_1.logger.debug(`[timeout] ${label} timed out after ${ms}ms`);
                reject(new Error(`${label} timeout after ${ms}ms`));
            }, ms);
            p.finally(() => clearTimeout(timer));
        })
    ]);
}
function fixJsonSyntax(jsonText) {
    let fixed = jsonText
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double
        .replace(/\\n/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed += '}';
    }
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixed += ']';
    }
    return fixed;
}
async function codegenAgent(step, params = {}, query, onChunk) {
    logger_1.logger.debug(`[codegen] START: stepId=${step.id} tag=${step.tag}`, { params, query });
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error('GEMINI_API_KEY is not set - NO FALLBACKS ALLOWED');
    }
    const genAI = new generative_ai_1.GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: MODEL });
    const prompt = [
        'You are a world-class educator creating dynamic, engaging educational content.',
        'Output STRICT JSON: { "type": "actions", "actions": [action_objects] }',
        'Available visualization actions:',
        '- { "op": "clear", "target": "all" }',
        '- { "op": "drawAxis", "normalized": true, "xLabel": string, "yLabel": string }',
        '- { "op": "drawCurve", "normalized": true, "points": [[x,y],...], "color": string, "duration": 2, "width": 2 }',
        '- { "op": "drawLabel", "normalized": true, "text": string, "x": number, "y": number, "color": string }',
        '- { "op": "drawMathLabel", "normalized": true, "tex": string, "x": number, "y": number }',
        '- { "op": "drawTitle", "text": string, "y": 0.1, "duration": 1 }',
        '- { "op": "drawParticles", "normalized": true, "x": number, "y": number, "count": 20, "color": string }',
        '- { "op": "drawSpiral", "normalized": true, "x": number, "y": number, "radius": 100, "rotations": 3 }',
        '- { "op": "drawRipple", "normalized": true, "x": number, "y": number, "maxRadius": 100, "count": 3 }',
        '- { "op": "delay", "duration": 1 }',
        '',
        'Create rich, animated visualizations that help explain the concept.',
        'Use multiple animation types to create engaging content.',
        'Coordinates are normalized (0-1) when normalized:true.',
        `Step: ${step.desc}`,
        query ? `Topic: ${query}` : '',
        'Make it visually stunning and educational!'
    ].filter(Boolean).join('\n');
    logger_1.logger.debug(`[codegen] Sending prompt to Gemini for tag=${step.tag}`);
    const res = await withTimeout(model.generateContent(prompt), DEFAULT_TIMEOUT, 'codegen/gemini');
    const text = res.response.text();
    logger_1.logger.debug(`[codegen] Received response from Gemini for tag=${step.tag}, length: ${text.length}`);
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON found in response - NO FALLBACKS');
    }
    let jsonText = text.slice(jsonStart, jsonEnd + 1);
    jsonText = jsonText.replace(/```json|```/g, "").trim();
    let chunk;
    try {
        chunk = JSON.parse(jsonText);
        logger_1.logger.debug('[codegen] JSON parsed successfully on first attempt');
    }
    catch (firstError) {
        logger_1.logger.debug(`[codegen] JSON parse failed, attempting to fix: ${firstError}`);
        const fixedJson = fixJsonSyntax(jsonText);
        try {
            chunk = JSON.parse(fixedJson);
            logger_1.logger.debug('[codegen] JSON parsed successfully after syntax fix');
        }
        catch (secondError) {
            logger_1.logger.error(`[codegen] JSON parse failed completely: ${secondError}`);
            throw new Error(`Failed to parse codegen response: ${secondError}`);
        }
    }
    if (!chunk.actions || !Array.isArray(chunk.actions)) {
        throw new Error('Invalid actions in response - NO FALLBACKS');
    }
    chunk.stepId = step.id;
    logger_1.logger.debug(`[codegen] SUCCESS: Generated ${chunk.actions.length} actions for step ${step.id}`);
    return chunk;
}
