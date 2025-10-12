"use strict";
/**
 * PURE VISUAL GENERATOR
 *
 * Takes ONE visual script and generates ONE high-quality animated SVG
 * This is called 4 times per step (4 independent LLM calls)
 *
 * Maintains same quality as codegenV3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pureVisualGenerator = pureVisualGenerator;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const MODEL = 'gemini-2.5-flash';
const MAX_OUTPUT_TOKENS = 16384;
const TIMEOUT_MS = 45000; // 45s per visual
function createVisualPrompt(script, topic, stepId) {
    return `Create animated SVG visualization for "${topic}":

VISUAL ${stepId}: ${script.title}
TYPE: ${script.type}
DESCRIPTION: ${script.description}
FOCUS: ${script.focus}

Requirements:
- Use <animate>, <animateMotion>, or <animateTransform> for movement
- Label ALL key components with <text> elements  
- Highly detailed and educational
- Max 200 lines, focused and clear
- Pure SVG only (no HTML/CSS/JS)
- Professional quality visualization

Start with <?xml version="1.0"?> and output ONLY the SVG code:`;
}
async function pureVisualGenerator(script, topic, stepId, visualIndex) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger_1.logger.error('[pureVisualGenerator] GEMINI_API_KEY not set');
        return null;
    }
    try {
        const startTime = Date.now();
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
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
        const prompt = createVisualPrompt(script, topic, visualIndex + 1);
        logger_1.logger.debug(`[pureVisualGenerator] Generating visual ${visualIndex + 1} for step ${stepId}: "${script.title}"`);
        const generationPromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Generation timeout')), TIMEOUT_MS));
        const result = await Promise.race([generationPromise, timeoutPromise]);
        if (!result?.response) {
            throw new Error('No response from API');
        }
        const candidate = result.response.candidates?.[0];
        if (!candidate) {
            throw new Error('No candidates in response');
        }
        // Check finish reason
        if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
            logger_1.logger.error('[pureVisualGenerator] Content blocked by safety filters');
            throw new Error('Content blocked by safety filters');
        }
        // Extract SVG code
        let svgCode = '';
        if (result.response.text) {
            svgCode = result.response.text();
        }
        if (!svgCode && candidate?.content?.parts) {
            svgCode = candidate.content.parts
                .filter((part) => part.text)
                .map((part) => part.text)
                .join('');
        }
        if (!svgCode || svgCode.trim().length === 0) {
            throw new Error('No text content in API response');
        }
        // Clean markdown wrappers
        svgCode = svgCode
            .replace(/```xml\n?/g, '')
            .replace(/```svg\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        // Validate SVG structure
        if (!svgCode.includes('<svg')) {
            throw new Error('No <svg> tag found in generated content');
        }
        // Auto-repair missing closing tags
        const openSvgTags = (svgCode.match(/<svg/g) || []).length;
        let closeSvgTags = (svgCode.match(/<\/svg>/g) || []).length;
        if (openSvgTags > closeSvgTags) {
            const missing = openSvgTags - closeSvgTags;
            logger_1.logger.warn(`[pureVisualGenerator] Auto-repair: Adding ${missing} closing </svg> tag(s)`);
            for (let i = 0; i < missing; i++) {
                svgCode += '\n</svg>';
            }
        }
        // Ensure XML declaration
        if (!svgCode.startsWith('<?xml')) {
            svgCode = '<?xml version="1.0" standalone="no"?>\n' + svgCode;
        }
        // Extract clean SVG
        const svgMatch = svgCode.match(/<\?xml[\s\S]*<\/svg>/i) ||
            svgCode.match(/<svg[\s\S]*<\/svg>/i);
        if (svgMatch) {
            svgCode = svgMatch[0];
        }
        // Calculate stats
        const animateCount = (svgCode.match(/<animate[^>]*>/g) || []).length;
        const animateMotionCount = (svgCode.match(/<animateMotion[^>]*>/g) || []).length;
        const animateTransformCount = (svgCode.match(/<animateTransform[^>]*>/g) || []).length;
        const totalAnimations = animateCount + animateMotionCount + animateTransformCount;
        const textLabels = (svgCode.match(/<text/g) || []).length;
        const shapes = (svgCode.match(/<circle|<rect|<path|<ellipse|<polygon/g) || []).length;
        const genTime = ((Date.now() - startTime) / 1000).toFixed(2);
        logger_1.logger.info(`[pureVisualGenerator] ✅ Visual ${visualIndex + 1} generated in ${genTime}s (${svgCode.length} chars)`);
        logger_1.logger.info(`[pureVisualGenerator] 🎬 Animations: ${totalAnimations}, Labels: ${textLabels}, Shapes: ${shapes}`);
        return {
            svgCode,
            title: script.title,
            type: script.type,
            hasAnimations: totalAnimations > 0,
            stats: {
                chars: svgCode.length,
                animations: totalAnimations,
                labels: textLabels,
                shapes
            }
        };
    }
    catch (error) {
        logger_1.logger.error(`[pureVisualGenerator] Failed for visual ${visualIndex + 1}: ${error.message}`);
        return null;
    }
}
