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
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash', // PAID MODEL - NEVER DOWNGRADE
            generationConfig: {
                temperature: 0.75, // Slightly higher for creative clarifications
                maxOutputTokens: 4000
            },
            systemInstruction: 'You are a JSON-only clarifier. Output ONLY a valid JSON object with fields: title, explanation, actions (array). Never include markdown, comments, or any text outside the JSON.'
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
        // Clean JSON response (remove markdown code blocks if present)
        let cleanedResponse = response.trim();
        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        }
        else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }
        // Parse and validate response
        const parsed = JSON.parse(cleanedResponse);
        if (!parsed.title || !parsed.explanation || !Array.isArray(parsed.actions)) {
            throw new Error('Invalid clarification response structure');
        }
        const duration = Date.now() - startTime;
        logger_1.logger.info(`[clarifier] ✅ Clarification generated in ${duration}ms - ${parsed.actions.length} actions`);
        return {
            title: parsed.title,
            explanation: parsed.explanation,
            actions: parsed.actions
        };
    }
    catch (error) {
        logger_1.logger.error(`[clarifier] Error generating clarification: ${error}`);
        throw error;
    }
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
- 10-15 actions MAXIMUM
- ALL coordinates normalized (0-1 range)
- Use "normalized": true for all spatial operations
- SPECIFIC to their question, not generic
- Pure JSON output - NO markdown, NO comments`;
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
