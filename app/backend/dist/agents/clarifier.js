"use strict";
/**
 * Clarifier Agent
 * Generates contextual clarification for student questions during lecture
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clarifierAgent = clarifierAgent;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is required for clarifier agent');
}
const genAI = new generative_ai_1.GoogleGenerativeAI(API_KEY);
/**
 * Generate contextual clarification based on student question
 */
async function clarifierAgent(request) {
    const startTime = Date.now();
    logger_1.logger.info(`[clarifier] Generating clarification for: "${request.question}"`);
    logger_1.logger.debug(`[clarifier] Context - Topic: ${request.query}, Step: ${request.step.id} (${request.step.tag})`);
    logger_1.logger.debug(`[clarifier] Screenshot provided: ${!!request.screenshot}`);
    const MAX_RETRIES = 3;
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            logger_1.logger.debug(`[clarifier] Attempt ${attempt}/${MAX_RETRIES}`);
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash', // PAID MODEL - NEVER DOWNGRADE
                generationConfig: {
                    temperature: 0.6, // Lower temperature for more reliable JSON
                    maxOutputTokens: 4000,
                    topK: 40,
                    topP: 0.95
                },
                systemInstruction: `You are a strict JSON generator. You MUST output ONLY valid, complete JSON.

RULES:
1. Output MUST start with { and end with }
2. ALL strings must be properly quoted
3. ALL brackets must be closed
4. NO trailing commas
5. NO comments or explanations
6. NO markdown formatting
7. COMPLETE the JSON before stopping

Output format:
{
  "title": "string",
  "explanation": "string",
  "actions": [{"op": "string", ...}]
}`
            });
            // Build multimodal prompt
            const promptParts = await buildMultimodalPrompt(request);
            logger_1.logger.debug(`[clarifier] Sending ${promptParts.length}-part multimodal request to Gemini...`);
            const result = await model.generateContent(promptParts);
            let response = '';
            try {
                response = result.response.text();
            }
            catch { }
            // Fallback: extract from candidate parts if text() is empty
            if (!response || response.trim().length === 0) {
                const candidate = result?.response?.candidates?.[0];
                const parts = candidate?.content?.parts;
                if (Array.isArray(parts)) {
                    response = parts.map((p) => p?.text || '').join('').trim();
                }
            }
            if (!response || response.trim().length === 0) {
                throw new Error('Empty LLM response');
            }
            logger_1.logger.debug(`[clarifier] Raw response length: ${response.length} chars`);
            logger_1.logger.debug(`[clarifier] Raw response preview: ${response.substring(0, 200)}...`);
            // ENHANCED JSON CLEANING
            let cleanedResponse = response.trim();
            // Remove markdown code blocks
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            }
            else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }
            // Remove any text before first { or after last }
            const firstBrace = cleanedResponse.indexOf('{');
            const lastBrace = cleanedResponse.lastIndexOf('}');
            if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
                throw new Error('No valid JSON braces found in response');
            }
            cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
            // Try to fix common JSON issues
            cleanedResponse = fixCommonJsonIssues(cleanedResponse);
            logger_1.logger.debug(`[clarifier] Cleaned response length: ${cleanedResponse.length} chars`);
            // Parse and validate response
            const parsed = JSON.parse(cleanedResponse);
            if (!parsed.title || !parsed.explanation || !Array.isArray(parsed.actions)) {
                throw new Error('Invalid clarification response structure');
            }
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[clarifier] ✅ Clarification generated in ${duration}ms - ${parsed.actions.length} actions (attempt ${attempt})`);
            return {
                title: parsed.title,
                explanation: parsed.explanation,
                actions: parsed.actions
            };
        }
        catch (error) {
            lastError = error;
            logger_1.logger.warn(`[clarifier] Attempt ${attempt} failed: ${error.message}`);
            if (attempt < MAX_RETRIES) {
                const backoffMs = 1000 * attempt; // 1s, 2s, 3s
                logger_1.logger.debug(`[clarifier] Retrying in ${backoffMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
            }
        }
    }
    // All retries failed - return fallback clarification
    logger_1.logger.error(`[clarifier] All ${MAX_RETRIES} attempts failed. Last error: ${lastError?.message}`);
    logger_1.logger.info(`[clarifier] Generating fallback clarification...`);
    return generateFallbackClarification(request, lastError);
}
/**
 * Build multimodal prompt with optional screenshot
 */
async function buildMultimodalPrompt(request) {
    const { query, step, question, plan, screenshot } = request;
    const textPrompt = `You are an elite AI professor creating a CONTEXTUAL CLARIFICATION for a confused student.

LECTURE CONTEXT:
- Topic: ${query}
- Current Step: ${step.tag} - ${step.desc}
- Plan: ${plan.title}

STUDENT'S QUESTION:
"${question}"

${screenshot ? '📸 SCREENSHOT PROVIDED: Analyze the visual content to understand what the student is confused about.' : ''}

YOUR TASK:
Generate a FOCUSED, SVG-BASED clarification that:
1. Directly addresses the student's specific confusion
2. Builds on what was shown in "${step.tag}"
3. Uses SVG operations to create clear visual explanations
4. Provides 10-15 visual actions maximum
5. Makes the concept crystal clear

OUTPUT FORMAT (JSON ONLY):
{
  "title": "Clear Answer Title",
  "explanation": "One sentence summary",
  "actions": [
    {"op": "drawLabel", "text": "Let me clarify...", "x": 0.1, "y": 0.1, "fontSize": 16, "normalized": true},
    {"op": "drawCircle", "x": 0.5, "y": 0.3, "radius": 0.05, "color": "#4CAF50", "normalized": true},
    {"op": "drawVector", "x": 0.5, "y": 0.3, "dx": 0.2, "dy": 0.1, "color": "#2196F3", "label": "Force", "normalized": true},
    {"op": "delay", "ms": 800}
  ]
}

AVAILABLE OPERATIONS:
- drawTitle, drawLabel (text with fontSize, color)
- drawCircle, drawRect, drawLine (basic shapes)
- drawVector, arrow (arrows with labels)
- orbit, wave, particle (animations)
- drawAxis, drawCurve, graph (math visualizations)
- delay (pacing for comprehension)

CRITICAL RULES:
- Output MUST be complete, valid JSON
- MUST close all brackets and braces
- 10-15 actions MAXIMUM
- ALL coordinates normalized (0-1 range)
- Use "normalized": true for all spatial operations
- SPECIFIC to their question, not generic
- NO trailing commas
- NO markdown, NO comments, NO explanations
- Start with { and end with }
- If you can't finish, output at least the closing }}`;
    const parts = [{ text: textPrompt }];
    // Add screenshot as image part if provided
    if (screenshot) {
        try {
            // Extract base64 data from data URL
            const base64Match = screenshot.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
            if (base64Match) {
                const mimeType = `image/${base64Match[1]}`;
                const base64Data = base64Match[2];
                parts.push({
                    inlineData: {
                        mimeType,
                        data: base64Data
                    }
                });
                logger_1.logger.debug(`[clarifier] Added screenshot as ${mimeType} image part`);
            }
            else {
                logger_1.logger.warn('[clarifier] Screenshot format not recognized, using text-only prompt');
            }
        }
        catch (error) {
            logger_1.logger.error(`[clarifier] Error processing screenshot: ${error}`);
        }
    }
    return parts;
}
/**
 * Fix common JSON formatting issues
 */
function fixCommonJsonIssues(json) {
    let fixed = json;
    // Remove trailing commas before closing braces/brackets
    fixed = fixed.replace(/,\s*([\]}])/g, '$1');
    // Ensure all property names are quoted
    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    // Fix incomplete strings at the end
    const lastQuote = fixed.lastIndexOf('"');
    const lastBrace = fixed.lastIndexOf('}');
    if (lastQuote > lastBrace) {
        // String wasn't closed, add closing quote
        fixed = fixed.substring(0, lastQuote + 1) + '"' + fixed.substring(lastQuote + 1);
    }
    return fixed;
}
/**
 * Generate a fallback clarification when LLM fails
 */
function generateFallbackClarification(request, error) {
    logger_1.logger.info(`[clarifier] Creating fallback clarification for: "${request.question}"`);
    return {
        title: 'Let me help clarify that',
        explanation: `I understand you have a question about "${request.question}". Let me break this down visually.`,
        actions: [
            {
                op: 'drawTitle',
                text: `Clarifying: ${request.step.tag}`,
                x: 0.5,
                y: 0.1,
                fontSize: 24,
                color: '#4CAF50',
                normalized: true
            },
            {
                op: 'drawLabel',
                text: `Question: ${request.question.substring(0, 60)}${request.question.length > 60 ? '...' : ''}`,
                x: 0.1,
                y: 0.25,
                fontSize: 16,
                color: '#FFC107',
                normalized: true
            },
            {
                op: 'drawLabel',
                text: 'Let me help you understand this concept better.',
                x: 0.1,
                y: 0.35,
                fontSize: 14,
                color: '#E0E0E0',
                normalized: true
            },
            {
                op: 'drawRect',
                x: 0.15,
                y: 0.45,
                width: 0.7,
                height: 0.15,
                color: '#2196F3',
                alpha: 0.2,
                normalized: true
            },
            {
                op: 'drawLabel',
                text: 'Key Point 1: Foundation',
                x: 0.2,
                y: 0.5,
                fontSize: 14,
                color: '#2196F3',
                normalized: true
            },
            {
                op: 'drawLabel',
                text: `This relates to ${request.step.tag}`,
                x: 0.2,
                y: 0.55,
                fontSize: 12,
                color: '#90CAF9',
                normalized: true
            },
            {
                op: 'delay',
                ms: 1000
            },
            {
                op: 'drawCircle',
                x: 0.5,
                y: 0.75,
                radius: 0.08,
                color: '#4CAF50',
                normalized: true
            },
            {
                op: 'drawLabel',
                text: 'Understanding Check ✓',
                x: 0.5,
                y: 0.9,
                fontSize: 14,
                color: '#4CAF50',
                normalized: true
            }
        ]
    };
}
//# sourceMappingURL=clarifier.js.map