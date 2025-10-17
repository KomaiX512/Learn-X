"use strict";
/**
 * SVG ANIMATION GENERATOR - SIMPLIFIED
 *
 * Uses proven user prompt pattern that generates perfect animations
 * NO complexity, NO examples, NO templates - just clear instructions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnimationPrompt = createAnimationPrompt;
exports.validateAnimationQuality = validateAnimationQuality;
exports.generateSVGAnimation = generateSVGAnimation;
exports.svgAnimationToAction = svgAnimationToAction;
exports.generateAnimationsForStep = generateAnimationsForStep;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
/**
 * SIMPLE DIRECT PROMPT - Matches user's successful pattern exactly
 */
function createAnimationPrompt(topic, description, animationType) {
    return `Write a script of code in 2D SIMPLE pure in SVG code with focused minimal clear animation of ${description} for the topic "${topic}". Code length not more than 250 lines.

The animation should depict the key concepts with actual labeled elements moving and interacting. Include labeled animations showcasing identification and movement of all relevant components.

Label all molecules, cells, structures, and concepts with synchronized movement and full-color visuals. The labels should clearly indicate the names making it educational for students. Ensure the visual experience is engaging and informative for educational purposes.

NOTE: My compiler is just SVG compiler so do ONLY pure SVG. NO surrounding HTML, external CSS, and JavaScript. Start with <?xml version="1.0"?>

OUTPUT ONLY THE PURE SVG CODE:`;
}
/**
 * MINIMAL validation - just check it's valid SVG
 */
function validateAnimationQuality(svgCode) {
    // TRUST THE LLM - Only validate structure exists
    const hasStructure = svgCode.includes('<svg') && svgCode.includes('</svg>');
    if (!hasStructure) {
        return { valid: false, score: 0, issues: ['No SVG structure'] };
    }
    // Has structure = valid
    return { valid: true, score: 100, issues: [] };
}
/**
 * SIMPLIFIED GENERATION - Trust the LLM, single attempt
 */
async function generateSVGAnimation(topic, description, animationType, apiKey) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const TIMEOUT = Number(process.env.LLM_TIMEOUT_MS || 90000);
    logger_1.logger.info(`[SVG] Generating ${animationType} for: ${topic}`);
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 8192,
            topK: 40,
            topP: 0.95
        }
    });
    const prompt = createAnimationPrompt(topic, description, animationType);
    try {
        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${TIMEOUT}ms`)), TIMEOUT))
        ]);
        let raw = '';
        try {
            raw = result.response.text();
        }
        catch { }
        if (!raw || raw.trim().length === 0) {
            const candidate = result?.response?.candidates?.[0];
            const parts = candidate?.content?.parts;
            if (Array.isArray(parts)) {
                raw = parts.map((p) => p?.text || '').join('').trim();
            }
        }
        if (!raw || raw.trim().length === 0) {
            throw new Error('Empty LLM response');
        }
        let svgCode = raw;
        // Clean markdown wrappers
        svgCode = svgCode
            .replace(/```xml\n?/g, '')
            .replace(/```svg\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        // Extract SVG content
        const svgMatch = svgCode.match(/<\?xml[\s\S]*?<svg[\s\S]*?<\/svg>/i) ||
            svgCode.match(/<svg[\s\S]*?<\/svg>/i);
        if (svgMatch) {
            svgCode = svgMatch[0];
            // Add XML header if missing
            if (!svgCode.startsWith('<?xml')) {
                svgCode = '<?xml version="1.0" standalone="no"?>\n' + svgCode;
            }
        }
        // Validate structure
        const validation = validateAnimationQuality(svgCode);
        if (!validation.valid) {
            throw new Error('Generated SVG has no valid structure');
        }
        logger_1.logger.info(`[SVG] ✅ Generated ${svgCode.length} chars`);
        return svgCode;
    }
    catch (error) {
        logger_1.logger.error(`[SVG] Generation failed: ${error.message}`);
        throw error; // NO FALLBACK - fail properly
    }
}
/**
 * Convert SVG animation to Action format for frontend
 */
function svgAnimationToAction(svgCode, visualGroup = 'animation-1') {
    return {
        op: 'customSVG',
        svgCode,
        visualGroup
    };
}
/**
 * Generate multiple animations for a step
 */
async function generateAnimationsForStep(topic, descriptions, apiKey) {
    const actions = [];
    for (let i = 0; i < descriptions.length; i++) {
        const { desc, type } = descriptions[i];
        logger_1.logger.info(`[SVG-ANIMATION] Generating animation ${i + 1}/${descriptions.length}: ${type}`);
        try {
            const svgCode = await generateSVGAnimation(topic, desc, type, apiKey);
            const action = svgAnimationToAction(svgCode, `animation-${i + 1}`);
            actions.push(action);
            // Add delay between animations
            if (i < descriptions.length - 1) {
                actions.push({ op: 'delay', ms: 2000 });
            }
        }
        catch (error) {
            logger_1.logger.error(`[SVG-ANIMATION] Failed to generate animation ${i + 1}: ${error.message}`);
            // Continue with other animations
        }
    }
    return actions;
}
exports.default = generateSVGAnimation;
//# sourceMappingURL=svgAnimationGenerator.js.map