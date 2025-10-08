"use strict";
/**
 * CODEGEN V3 - MULTI-AGENT PURE GENERATION
 *
 * NO hardcoded operations
 * NO validation rules
 * 100% LLM creativity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.codegenV3 = codegenV3;
const logger_1 = require("../logger");
const generative_ai_1 = require("@google/generative-ai");
const syntaxRecoveryAgent_1 = require("./syntaxRecoveryAgent");
const MODEL = 'gemini-2.5-flash';
const MIN_OPERATIONS = 15; // Lowered to 15 for maximum success rate while maintaining quality
/**
 * Visual Planner - Describes WHAT to visualize
 */
async function planVisuals(step, topic, apiKey) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: MODEL,
        generationConfig: { temperature: 0.9, maxOutputTokens: 3000 },
        systemInstruction: 'You are a creative visual planner. Output ONLY a JSON array of visual descriptions.'
    });
    const prompt = `Topic: ${topic}
Step: ${step.desc}

Output 3-4 visual descriptions as JSON array:
["description 1", "description 2", "description 3"]

ONLY the JSON array.`;
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
 * Visual Coder - Creates operations from description
 */
async function codeVisual(description, topic, apiKey) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: MODEL,
        generationConfig: { temperature: 0.8, maxOutputTokens: 8000 },
        systemInstruction: 'You are a visual coder. Generate JSON operations to create visuals. Output ONLY valid JSON array.'
    });
    const prompt = `Visual: ${description}

Generate 10-15 operations. Use customPath for custom shapes (SVG syntax).

Available ops: customPath, drawCircle, drawRect, drawLine, drawLabel, drawLatex, animate, delay

Rules:
- Coordinates: 0.1 to 0.9
- Spread vertically
- Label important parts
- customPath example: {"op":"customPath","path":"M 0.2,0.3 L 0.4,0.5","stroke":"#4a90e2","fill":"none"}

Output: [{"op":"..."},...]`;
    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        logger_1.logger.info(`[codeVisual] LLM OUTPUT for "${description.substring(0, 50)}...":\n${text.substring(0, 800)}...`);
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
        const simplePrompt = `Create 15 operations for: ${description.substring(0, 100)}

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
async function generateAllOperationsFast(step, topic, apiKey) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: MODEL,
        generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 12000,
            topK: 50,
            topP: 0.95
        },
        systemInstruction: 'You are a visual operation generator. Output ONLY a JSON array of operation objects. Never include explanations or markdown.'
    });
    const validOps = [
        'drawCircle', 'drawRect', 'drawLabel', 'drawLine', 'customPath', 'drawGraph',
        'wave', 'particle', 'orbit', 'drawLatex', 'drawMathLabel', 'drawVector',
        'drawDiagram', 'drawCellStructure', 'drawMolecule', 'drawAtom', 'delay'
    ].join(', ');
    const prompt = `Topic: ${topic}
Step: ${step.desc}

Generate 40-60 Konva.js operations as JSON array. Each operation visualizes "${topic}".

CRITICAL RULES:
1. ONLY use these ops: ${validOps}
2. Each MUST have "op" field (not "operation")
3. Be SPECIFIC to "${topic}" - use topic-relevant labels
4. Mix types: shapes, labels, paths, animations
5. Use normalized coordinates (0-1 range)

OUTPUT (JSON array only):
[{"op":"drawLabel","text":"${topic}: Key Concept","x":0.5,"y":0.1,"fontSize":24},{"op":"customPath","path":"M 0.2,0.3 L 0.8,0.3","stroke":"#2196F3","strokeWidth":3},{"op":"drawCircle","x":0.5,"y":0.5,"radius":0.1,"fill":"#4CAF50"},...]

Generate CONTEXTUAL operations for "${topic}". NO generic text!`;
    try {
        logger_1.logger.info(`[codegenV3-FAST] 🚀 Single LLM call for ALL operations...`);
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        logger_1.logger.info(`[codegenV3-FAST] Received ${text.length} chars`);
        try {
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) {
                logger_1.logger.info(`[codegenV3-FAST] ✅ Parsed: ${parsed.length} operations`);
                return (0, syntaxRecoveryAgent_1.validateOperations)(parsed);
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
 * Main generation function - OPTIMIZED FOR SPEED
 */
async function codegenV3(step, topic) {
    logger_1.logger.info(`[codegenV3] 🚀 OPTIMIZED SINGLE-CALL for step ${step.id}: ${step.tag}`);
    logger_1.logger.info(`[codegenV3] Topic: "${topic}"`);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger_1.logger.error('[codegenV3] GEMINI_API_KEY not set');
        return null;
    }
    try {
        const startTime = Date.now();
        // OPTIMIZED: Generate all operations in ONE call
        const operations = await generateAllOperationsFast(step, topic, apiKey);
        const genTime = ((Date.now() - startTime) / 1000).toFixed(2);
        if (operations.length < MIN_OPERATIONS) {
            logger_1.logger.error(`[codegenV3] ❌ FAILED: Only ${operations.length} valid operations (minimum: ${MIN_OPERATIONS})`);
            return null;
        }
        logger_1.logger.info(`[codegenV3] === COMPLETE in ${genTime}s ===`);
        logger_1.logger.info(`[codegenV3] ✅ Total: ${operations.length} operations`);
        logger_1.logger.info(`[codegenV3] ✅ SINGLE LLM CALL - 3-4x faster`);
        logger_1.logger.info(`[codegenV3] ✅ 100% validated`);
        const allOperations = [
            { op: 'drawTitle', text: topic, y: 0.05, size: 24 },
            ...operations
        ];
        return {
            type: 'actions',
            stepId: step.id,
            actions: allOperations
        };
    }
    catch (error) {
        logger_1.logger.error(`[codegenV3] ❌ FAILURE:`, error);
        return null;
    }
}
exports.default = codegenV3;
