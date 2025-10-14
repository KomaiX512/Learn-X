"use strict";
/**
 * NARRATION GENERATOR - Optimized for Efficient Batch Processing
 *
 * Generates spoken narration text for all visuals in a step using ONE API call.
 * Designed to work with text-to-speech systems for educational content delivery.
 *
 * ARCHITECTURE:
 * - Input: All SVG codes for a step (notes + animations)
 * - Output: Structured narration for each visual
 * - One API call per step (not per visual)
 * - Runs in parallel with visual generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStepNarration = generateStepNarration;
exports.generateSingleNarration = generateSingleNarration;
exports.generateBatchNarrations = generateBatchNarrations;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const MODEL = 'gemini-2.5-flash';
const MAX_OUTPUT_TOKENS = 8000;
const TEMPERATURE = 0.7;
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000;
/**
 * Optimized prompt for batch narration generation
 * Generates all narrations in one API call
 */
const NARRATION_PROMPT = `You are an educational voice-over script writer for animated educational content.

Your task: Generate concise, engaging SPOKEN narration scripts for multiple visuals in a learning step.

CRITICAL REQUIREMENTS:
1. **One paragraph per visual** (3-5 sentences, 40-80 words)
2. **Conversational tone** - Write as if speaking to a student
3. **Visual-specific** - Reference what the student sees on screen
4. **Contextual flow** - Each narration should flow from previous one
5. **No meta-commentary** - Don't say "this visual shows" or "as you can see"
6. **Educational focus** - Explain concepts, not describe visuals
7. **Pacing guidance** - Each paragraph should take 15-25 seconds to speak

OUTPUT FORMAT (JSON):
{
  "narrations": [
    {
      "visualNumber": 0,
      "type": "notes",
      "narration": "...",
      "duration": 20
    },
    {
      "visualNumber": 1,
      "type": "animation",
      "narration": "...",
      "duration": 18
    }
  ]
}

NARRATION STYLE GUIDE:
✓ "Let's explore how neurons communicate..."
✓ "Notice the electrical impulse traveling down the axon..."
✓ "This is the key insight: voltage changes trigger action..."
✗ "This diagram shows a neuron..."
✗ "As you can see in this visual..."
✗ "The image displays..."

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanations.`;
/**
 * Generate narrations for all visuals in a step (ONE API CALL)
 */
async function generateStepNarration(step, topic, visuals) {
    logger_1.logger.info(`[narration] Generating narrations for step ${step.id} (${visuals.length} visuals)`);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }
    let lastError = null;
    // Retry loop
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const startTime = Date.now();
            const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: MODEL,
                generationConfig: {
                    temperature: TEMPERATURE,
                    maxOutputTokens: MAX_OUTPUT_TOKENS,
                    topK: 40,
                    topP: 0.95
                },
                systemInstruction: 'You are an educational narration writer. Output ONLY valid JSON objects. Never include explanations, markdown formatting, or any text outside the JSON.',
            });
            // Construct input summary for all visuals
            const visualsSummary = visuals.map(v => {
                if (v.type === 'notes') {
                    const textElements = (v.svgCode?.match(/<text/g) || []).length;
                    return `Visual ${v.visualNumber} (Notes Keynote): Educational content with ${textElements} text elements. ${v.description || ''}`;
                }
                else {
                    return `Visual ${v.visualNumber} (Animation): ${v.actionCount || 0} animated operations. ${v.description || ''}`;
                }
            }).join('\n');
            const fullPrompt = `${NARRATION_PROMPT}

═══════════════════════════════════════════════════════════════
LEARNING STEP CONTEXT:
Topic: "${topic}"
Subtopic: "${step.desc}"
Step ID: ${step.id}

VISUALS IN THIS STEP:
${visualsSummary}
═══════════════════════════════════════════════════════════════

Generate narration scripts for ALL ${visuals.length} visuals above. Return ONLY the JSON object with all narrations.`;
            logger_1.logger.debug(`[narration] Sending prompt (${fullPrompt.length} chars) to Gemini`);
            const result = await model.generateContent(fullPrompt);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            // Validate response
            if (!result?.response) {
                throw new Error('No response from Gemini API');
            }
            // Check for blocks
            if (result.response.promptFeedback?.blockReason) {
                throw new Error(`Prompt blocked: ${result.response.promptFeedback.blockReason}`);
            }
            if (!result.response.candidates?.[0]) {
                throw new Error('No candidates in response');
            }
            const candidate = result.response.candidates[0];
            // Check finish reason
            if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
                throw new Error(`Content blocked: ${candidate.finishReason}`);
            }
            // Extract text
            let responseText = '';
            if (result.response.text) {
                responseText = result.response.text();
            }
            else if (candidate?.content?.parts) {
                responseText = candidate.content.parts
                    .filter((part) => part.text)
                    .map((part) => part.text)
                    .join('');
            }
            if (!responseText || responseText.trim().length === 0) {
                throw new Error('Empty response from Gemini');
            }
            // Clean markdown wrappers
            responseText = responseText
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            // Parse JSON
            let parsed;
            try {
                parsed = JSON.parse(responseText);
            }
            catch (parseError) {
                logger_1.logger.error(`[narration] JSON parse failed: ${parseError.message}`);
                logger_1.logger.error(`[narration] Raw response: ${responseText.substring(0, 500)}`);
                throw new Error(`JSON parse failed: ${parseError.message}`);
            }
            // Validate structure
            if (!parsed.narrations || !Array.isArray(parsed.narrations)) {
                throw new Error('Invalid response structure: missing narrations array');
            }
            // Validate and normalize narrations
            const narrations = parsed.narrations.map((n) => {
                if (typeof n.visualNumber !== 'number' || !n.narration) {
                    throw new Error('Invalid narration object: missing required fields');
                }
                return {
                    visualNumber: n.visualNumber,
                    type: n.type || (n.visualNumber === 0 ? 'notes' : 'animation'),
                    narration: n.narration.trim(),
                    duration: n.duration || estimateDuration(n.narration)
                };
            });
            // Validate we got narrations for all visuals
            if (narrations.length !== visuals.length) {
                logger_1.logger.warn(`[narration] Expected ${visuals.length} narrations, got ${narrations.length}`);
            }
            const totalDuration = narrations.reduce((sum, n) => sum + (n.duration || 0), 0);
            logger_1.logger.info(`[narration] ✅ Generated ${narrations.length} narrations in ${elapsed}s (${totalDuration}s total audio)`);
            return {
                stepId: step.id,
                topic,
                subtopic: step.desc,
                narrations,
                totalDuration
            };
        }
        catch (error) {
            lastError = error;
            logger_1.logger.error(`[narration] Attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`);
            if (attempt < MAX_RETRIES) {
                logger_1.logger.info(`[narration] Retrying in ${RETRY_DELAY}ms...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }
    }
    // All retries failed - return fallback narrations
    logger_1.logger.error(`[narration] All retries failed, generating fallback narrations`);
    return generateFallbackNarrations(step, topic, visuals);
}
/**
 * Estimate narration duration based on word count
 * Average speaking rate: 150 words per minute
 */
function estimateDuration(text) {
    const words = text.trim().split(/\s+/).length;
    const seconds = Math.ceil((words / 150) * 60);
    return Math.max(10, Math.min(seconds, 30)); // Clamp between 10-30 seconds
}
/**
 * Generate fallback narrations when API fails
 */
function generateFallbackNarrations(step, topic, visuals) {
    logger_1.logger.warn(`[narration] Using fallback narrations for step ${step.id}`);
    const narrations = visuals.map(v => {
        let fallbackText = '';
        if (v.type === 'notes') {
            fallbackText = `Let's dive into ${step.desc}. This is a fundamental concept in ${topic} that we'll explore step by step. Pay close attention to the key points and relationships we'll uncover.`;
        }
        else {
            fallbackText = `Now, let's visualize this concept in action. Watch how the elements interact and transform. This animation helps clarify the underlying principles we just discussed.`;
        }
        return {
            visualNumber: v.visualNumber,
            type: v.type,
            narration: fallbackText,
            duration: estimateDuration(fallbackText)
        };
    });
    const totalDuration = narrations.reduce((sum, n) => sum + (n.duration || 0), 0);
    return {
        stepId: step.id,
        topic,
        subtopic: step.desc,
        narrations,
        totalDuration
    };
}
/**
 * Generate narration for a single visual (legacy support)
 * Note: Prefer generateStepNarration for better efficiency
 */
async function generateSingleNarration(step, topic, visual) {
    const stepNarration = await generateStepNarration(step, topic, [visual]);
    return stepNarration.narrations[0];
}
/**
 * Batch generate narrations for multiple steps (advanced optimization)
 */
async function generateBatchNarrations(steps) {
    logger_1.logger.info(`[narration] Batch generating narrations for ${steps.length} steps`);
    // Generate in parallel with concurrency limit (5 at a time to avoid rate limits)
    const results = [];
    const concurrency = 5;
    for (let i = 0; i < steps.length; i += concurrency) {
        const batch = steps.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(({ step, topic, visuals }) => generateStepNarration(step, topic, visuals)));
        results.push(...batchResults);
        // Small delay between batches
        if (i + concurrency < steps.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    logger_1.logger.info(`[narration] ✅ Batch completed: ${results.length} steps processed`);
    return results;
}
