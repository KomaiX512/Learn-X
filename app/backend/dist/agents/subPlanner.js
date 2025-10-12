"use strict";
/**
 * SUB-PLANNER AGENT
 *
 * Generates 4 detailed visual descriptions for a single step
 * Each description is independent and covers a different aspect
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.subPlannerAgent = subPlannerAgent;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 40000;
function createSubPlanPrompt(step, topic) {
    return `You are planning 4 distinct SVG visualizations for this learning step.

TOPIC: "${topic}"
STEP: ${step.desc}

Create 4 DIFFERENT visual scripts that together give a complete understanding:
1. First visual - Core concept/diagram (static or minimal animation)
2. Second visual - Dynamic animation showing process/mechanism
3. Third visual - Simulation or interactive representation
4. Fourth visual - Graph/chart or analytical visualization

Each script should:
- Be UNIQUE and cover different aspects
- Have clear title and detailed description
- Specify what to show and how to animate it
- Be suitable for SVG implementation

Output ONLY valid JSON:
{
  "visualScripts": [
    {
      "type": "diagram|animation|simulation|graph",
      "title": "Brief title",
      "description": "Detailed description of what to visualize and how",
      "focus": "What specific aspect this visual emphasizes"
    },
    ... (4 total)
  ]
}`;
}
async function subPlannerAgent(step, topic) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger_1.logger.error('[subPlanner] GEMINI_API_KEY not set');
        return null;
    }
    try {
        const startTime = Date.now();
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: MODEL,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4000,
                topK: 40,
                topP: 0.95
            },
            systemInstruction: 'You are a JSON-only visual planning agent. Output ONLY valid JSON. Never include explanations, markdown, or text outside JSON.'
        });
        const prompt = createSubPlanPrompt(step, topic);
        logger_1.logger.debug(`[subPlanner] Planning 4 visuals for step ${step.id}`);
        const generationPromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('SubPlanner timeout')), TIMEOUT_MS));
        const result = await Promise.race([generationPromise, timeoutPromise]);
        if (!result?.response) {
            throw new Error('No response from API');
        }
        let text = result.response.text();
        // Clean markdown
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        // Parse JSON
        const parsed = JSON.parse(text);
        if (!parsed.visualScripts || !Array.isArray(parsed.visualScripts)) {
            throw new Error('Invalid sub-plan structure');
        }
        // Ensure exactly 4 visuals
        if (parsed.visualScripts.length < 4) {
            logger_1.logger.warn(`[subPlanner] Only ${parsed.visualScripts.length} visuals planned, expected 4`);
            // Pad with a generic visual if needed
            while (parsed.visualScripts.length < 4) {
                parsed.visualScripts.push({
                    type: 'diagram',
                    title: 'Supporting Visual',
                    description: step.desc,
                    focus: 'General overview'
                });
            }
        }
        const genTime = ((Date.now() - startTime) / 1000).toFixed(2);
        logger_1.logger.info(`[subPlanner] ✅ Generated 4 visual scripts in ${genTime}s for step ${step.id}`);
        logger_1.logger.debug(`[subPlanner] Scripts: ${parsed.visualScripts.map((s) => s.title).join(', ')}`);
        return {
            stepId: step.id,
            visualScripts: parsed.visualScripts.slice(0, 4) // Take first 4
        };
    }
    catch (error) {
        logger_1.logger.error(`[subPlanner] Failed: ${error.message}`);
        return null;
    }
}
