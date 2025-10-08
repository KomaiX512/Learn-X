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
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash', // DO NOT CHANGE
            generationConfig: {
                temperature: 0.7,
                responseMimeType: 'application/json'
            }
        });
        const prompt = buildClarificationPrompt(request);
        logger_1.logger.debug('[clarifier] Sending request to Gemini...');
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        logger_1.logger.debug(`[clarifier] Raw response length: ${response.length} chars`);
        // Parse and validate response
        const parsed = JSON.parse(response);
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
 * Build prompt for clarification generation
 */
function buildClarificationPrompt(request) {
    const { query, step, question, plan, screenshot } = request;
    return `You are an elite AI professor creating a CONTEXTUAL CLARIFICATION for a confused student.

LECTURE CONTEXT:
- Topic: ${query}
- Current Step: ${step.tag} - ${step.desc}
- Step Complexity: ${step.complexity}/5
- Plan: ${plan.title}

STUDENT'S QUESTION:
"${question}"

${screenshot ? '📸 VISUAL CONTEXT: The student attached a screenshot of the current canvas state.\n' : ''}

YOUR TASK:
Generate a FOCUSED, VISUAL clarification that:
1. Directly addresses the student's specific confusion
2. Builds on what was shown in "${step.tag}"
3. Uses the SAME visual language and metaphors from the lesson
4. Provides a COMPLETE mini-lesson (10-15 actions)
5. Ends with confidence that the concept is now clear

CLARIFICATION STRUCTURE:
{
  "title": "Clear, Direct Answer (e.g., 'Let me explain why X happens')",
  "explanation": "One sentence summary of what you'll clarify",
  "actions": [
    // 1. Acknowledge the confusion (1 drawLabel)
    {"op": "drawLabel", "text": "Great question! Let's break this down...", "x": 0.05, "y": 0.05, "normalized": true},
    
    // 2. Visual re-explanation (8-12 visual actions)
    // Use: drawCircle, drawRect, drawVector, orbit, wave, particle, arrow, drawAxis, drawCurve
    // Focus on the SPECIFIC confusion point
    
    // 3. Concrete example (2-3 actions)
    
    // 4. Confirmation (1 drawLabel)
    {"op": "drawLabel", "text": "Does this make it clearer?", "x": 0.05, "y": 0.9, "normalized": true}
  ]
}

CRITICAL RULES:
- 10-15 actions MAXIMUM (concise, focused clarification)
- 80% VISUAL operations (drawCircle, drawVector, orbit, wave, etc.)
- Reference the SPECIFIC step context
- Use normalized coordinates (0-1 range)
- Include proper delays (0.5-1.5s) for comprehension
- NO generic explanations - make it SPECIFIC to their question
- Use the SAME teaching style as the main lecture

VISUAL OPERATIONS AVAILABLE:
- drawTitle, drawLabel (text)
- drawCircle, drawRect (shapes)
- drawVector, arrow (directions)
- orbit, wave, particle (animations)
- drawAxis, drawCurve (graphs)
- delay (timing)

Generate the JSON now:`;
}
