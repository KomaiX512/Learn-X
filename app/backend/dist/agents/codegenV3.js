"use strict";
/**
 * CODEGEN V3 - SIMPLIFIED DIRECT GENERATION
 *
 * Single-stage SVG generation matching user's proven pattern
 * NO planning complexity, NO fallbacks, trust the LLM
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.codegenV3 = codegenV3;
const logger_1 = require("../logger");
const generative_ai_1 = require("@google/generative-ai");
const MODEL = 'gemini-2.5-flash';
const MAX_OUTPUT_TOKENS = 16384; // Increased for complex visuals
const GENERATION_TIMEOUT = 90000; // 90 seconds - allow for API variability
/**
 * SIMPLE PROMPT - Direct generation matching user's pattern
 */
function createStepPrompt(step, topic) {
    return `Write a script of code in 2D SIMPLE pure SVG code with focused minimal clear visual representation for teaching "${topic}" - specifically this concept: "${step.desc}"

Code length not more than 250 lines. Create a complete educational visualization that depicts the key concepts with actual labeled elements. Include labeled diagrams showcasing all relevant components and their relationships.

Label all structures, concepts, and processes with their scientific/technical names using synchronized full-color visuals. The labels should clearly indicate the names making it educational for students. Ensure the visual experience is engaging and informative for educational purposes.

NOTE: My compiler is just SVG compiler so do ONLY pure SVG. NO surrounding HTML, external CSS, and JavaScript. Start with <?xml version="1.0"?>

OUTPUT ONLY THE PURE SVG CODE:`;
}
/**
 * SIMPLIFIED SINGLE-STAGE GENERATION
 * Direct SVG generation - trust the LLM, no planning complexity
 */
async function codegenV3(step, topic) {
    logger_1.logger.info(`[codegenV3] Generating step ${step.id}: ${step.desc}`);
    logger_1.logger.info(`[codegenV3] Topic: "${topic}"`);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger_1.logger.error('[codegenV3] GEMINI_API_KEY not set');
        return null;
    }
    try {
        const startTime = Date.now();
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        // Generate complete SVG directly - NO planning stage
        const model = genAI.getGenerativeModel({
            model: MODEL,
            generationConfig: {
                temperature: 0.75,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                topK: 40,
                topP: 0.95
            },
            systemInstruction: 'You are an SVG code generator. Output ONLY valid SVG XML code. Never include explanations, markdown formatting, or any text outside the SVG code. Start with <?xml version="1.0"?> and include complete <svg> tags.'
        });
        const prompt = createStepPrompt(step, topic);
        logger_1.logger.debug(`[codegenV3] Prompt length: ${prompt.length} chars`);
        // Generate with timeout protection
        const generationPromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Generation timeout')), GENERATION_TIMEOUT));
        const result = await Promise.race([generationPromise, timeoutPromise]);
        // Check for response structure
        if (!result || !result.response) {
            logger_1.logger.error('[codegenV3] No response object from API');
            throw new Error('No response object from API');
        }
        // Check for candidates (API might block content)
        if (!result.response.candidates || result.response.candidates.length === 0) {
            logger_1.logger.error('[codegenV3] No candidates in response');
            logger_1.logger.error('[codegenV3] Response:', JSON.stringify(result.response, null, 2).substring(0, 500));
            throw new Error('No candidates in response - possible content filter');
        }
        // Get text
        let svgCode;
        try {
            svgCode = result.response.text();
        }
        catch (error) {
            logger_1.logger.error('[codegenV3] Failed to get text from response:', error.message);
            logger_1.logger.error('[codegenV3] Full response object:', JSON.stringify(result.response, null, 2));
            // Check for safety ratings blocking content
            const candidate = result.response.candidates?.[0];
            if (candidate?.finishReason) {
                logger_1.logger.error(`[codegenV3] Finish reason: ${candidate.finishReason}`);
                // Detect truncation reasons
                if (candidate.finishReason === 'MAX_TOKENS' || candidate.finishReason === 'LENGTH') {
                    throw new Error('API truncated response - increase maxOutputTokens or simplify prompt');
                }
                if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
                    throw new Error('API blocked content due to safety filters');
                }
            }
            if (candidate?.safetyRatings) {
                logger_1.logger.error('[codegenV3] Safety ratings:', JSON.stringify(candidate.safetyRatings));
            }
            throw new Error(`Failed to extract text: ${error.message}`);
        }
        if (!svgCode || svgCode.trim().length === 0) {
            logger_1.logger.error('[codegenV3] Empty text in response');
            logger_1.logger.error('[codegenV3] Full response for debugging:', JSON.stringify(result.response, null, 2));
            throw new Error('Empty response from API');
        }
        logger_1.logger.debug(`[codegenV3] Received ${svgCode.length} chars from API`);
        // Clean markdown wrappers
        svgCode = svgCode
            .replace(/```xml\n?/g, '')
            .replace(/```svg\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        // Extract SVG content - use greedy matching to capture full SVG
        const svgMatch = svgCode.match(/<\?xml[\s\S]*<\/svg>/i) ||
            svgCode.match(/<svg[\s\S]*<\/svg>/i);
        if (svgMatch) {
            svgCode = svgMatch[0];
            if (!svgCode.startsWith('<?xml')) {
                svgCode = '<?xml version="1.0" standalone="no"?>\n' + svgCode;
            }
        }
        // Validate SVG structure and completeness
        if (!svgCode.includes('<svg') || !svgCode.includes('</svg>')) {
            logger_1.logger.error('[codegenV3] ❌ NO SVG STRUCTURE FOUND');
            logger_1.logger.error('[codegenV3] Content received:');
            logger_1.logger.error(svgCode.substring(0, 1000));
            throw new Error('Generated content has no valid SVG structure');
        }
        // Check if SVG is complete (not truncated)
        const lastClosingTag = svgCode.lastIndexOf('</svg>');
        const svgLength = svgCode.length;
        const distanceFromEnd = svgLength - lastClosingTag - 6; // 6 = length of '</svg>'
        if (distanceFromEnd > 50) {
            logger_1.logger.warn(`[codegenV3] ⚠️ SVG might be truncated - ${distanceFromEnd} chars after </svg>`);
        }
        // Validate SVG is well-formed (basic check)
        const openSvgTags = (svgCode.match(/<svg/g) || []).length;
        const closeSvgTags = (svgCode.match(/<\/svg>/g) || []).length;
        if (openSvgTags !== closeSvgTags) {
            logger_1.logger.error(`[codegenV3] ❌ MALFORMED SVG - Open tags: ${openSvgTags}, Close tags: ${closeSvgTags}`);
            logger_1.logger.error('[codegenV3] Content preview:');
            logger_1.logger.error(svgCode.substring(0, 500) + '\n...\n' + svgCode.substring(svgCode.length - 500));
            throw new Error(`Malformed SVG - mismatched tags (${openSvgTags} open, ${closeSvgTags} close)`);
        }
        const genTime = ((Date.now() - startTime) / 1000).toFixed(2);
        // Log quality metrics (for monitoring, not validation)
        const hasAnimations = svgCode.includes('<animate') ||
            svgCode.includes('animateMotion') ||
            svgCode.includes('animateTransform');
        const textLabels = (svgCode.match(/<text/g) || []).length;
        const shapes = (svgCode.match(/<circle|<rect|<path|<ellipse|<polygon/g) || []).length;
        logger_1.logger.info(`[codegenV3] ✅ Generated SVG in ${genTime}s (${svgCode.length} chars)`);
        logger_1.logger.debug(`[codegenV3] Quality: animations=${hasAnimations}, labels=${textLabels}, shapes=${shapes}`);
        // Return as customSVG action
        const actions = [
            {
                op: 'customSVG',
                svgCode,
                visualGroup: `step-${step.id}`
            }
        ];
        return {
            type: 'actions',
            stepId: step.id,
            actions
        };
    }
    catch (error) {
        logger_1.logger.error(`[codegenV3] Generation failed: ${error.message}`);
        return null; // NO FALLBACK - fail properly
    }
}
exports.default = codegenV3;
