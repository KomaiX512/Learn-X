"use strict";
/**
 * TRANSCRIPT GENERATOR
 *
 * Generates educational narration for visual descriptions
 * Uses psychological teaching principles for engagement
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTranscript = generateTranscript;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const MODEL = 'gemini-2.5-flash';
const GENERATION_TIMEOUT = 30000; // 30s for transcript
/**
 * Generate educational transcript for multiple visuals
 * Applies first-principles teaching and psychological engagement
 */
async function generateTranscript(step, topic, visualDescriptions) {
    logger_1.logger.info(`[transcript] Generating for step ${step.id} with ${visualDescriptions.length} visuals`);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger_1.logger.error('[transcript] GEMINI_API_KEY not set');
        return null;
    }
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: MODEL,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
                topK: 40,
                topP: 0.95
            },
            systemInstruction: 'You are an educational narrator. Create engaging, clear explanations that guide students through visual content. Use conversational tone, first-principles thinking, and psychological hooks to maintain attention. Output ONLY the transcript text, no formatting or meta-commentary.'
        });
        const visualsList = visualDescriptions
            .map(v => `Visual ${v.visualNumber}: ${v.description}`)
            .join('\n');
        const prompt = `Topic: "${topic}"
Step: ${step.desc}

Visuals being shown:
${visualsList}

Create a clear, engaging narration (2-3 paragraphs) that:
1. Uses a hook to grab attention
2. Explains the concept using first principles
3. Connects to the visuals being displayed
4. Maintains conversational, student-friendly tone
5. Builds curiosity for next concepts

Output only the transcript:`;
        logger_1.logger.debug(`[transcript] Prompt length: ${prompt.length} chars`);
        const generationPromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Transcript generation timeout')), GENERATION_TIMEOUT));
        const result = await Promise.race([generationPromise, timeoutPromise]);
        if (!result?.response?.candidates?.[0]) {
            logger_1.logger.error('[transcript] No valid response from API');
            return null;
        }
        const transcript = result.response.text().trim();
        if (!transcript || transcript.length === 0) {
            logger_1.logger.error('[transcript] Empty transcript generated');
            return null;
        }
        logger_1.logger.info(`[transcript] ✅ Generated ${transcript.length} chars`);
        return transcript;
    }
    catch (error) {
        logger_1.logger.error(`[transcript] Generation failed: ${error.message}`);
        return null;
    }
}
