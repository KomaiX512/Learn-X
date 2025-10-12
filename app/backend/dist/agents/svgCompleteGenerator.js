"use strict";
/**
 * COMPLETE SVG GENERATOR
 *
 * Generates FULL SVG documents (not operations) with proper structure
 * Similar to the blood vessel example - complete, self-contained, educational
 *
 * Output: <?xml...><svg>...</svg> with animations, labels, structure
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCompleteSVGPrompt = createCompleteSVGPrompt;
exports.validateCompleteSVG = validateCompleteSVG;
exports.generateCompleteSVG = generateCompleteSVG;
exports.generateCompleteSVGsForStep = generateCompleteSVGsForStep;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
/**
 * Create a detailed prompt for COMPLETE SVG generation
 * Modeled after successful user pattern - detailed, specific, educational
 */
function createCompleteSVGPrompt(topic, description, verticalSection) {
    return `Write a script of code in 2D SIMPLE pure SVG code with focused minimal clear visual representation for: "${topic}"

${description}

Code length: not more than 200 lines. The diagram should clearly illustrate the concept with well-structured visual elements (circles, paths, rectangles, lines, etc.). Include labeled text elements that clearly identify all components, structures, and key concepts being shown, making it educational for students.

Label all relevant elements with their scientific/technical names. Use full-color visuals with appropriate colors for the domain (e.g., biology: reds/greens for organic structures, physics: blues/oranges for forces/energy, chemistry: element-specific colors based on standard conventions).

Ensure the visual experience is engaging, informative, and contextually accurate for educational purposes. Use proper SVG structure with <defs> for reusable elements if needed, and <style> tags for clean styling.

NOTE: My compiler is just SVG compiler, so output ONLY pure SVG code. NO surrounding HTML, external CSS, or JavaScript. Start with <?xml version="1.0"?> and use proper SVG namespace (xmlns="http://www.w3.org/2000/svg").

OUTPUT ONLY THE PURE SVG CODE:`;
}
/**
 * Validate complete SVG quality
 */
function validateCompleteSVG(svgCode) {
    const issues = [];
    let score = 0;
    // Basic structure checks
    if (!svgCode.includes('<?xml')) {
        issues.push('Missing XML declaration');
    }
    else {
        score += 10;
    }
    if (!svgCode.includes('<svg')) {
        issues.push('Missing SVG element');
        return { valid: false, score: 0, issues };
    }
    else {
        score += 15;
    }
    if (!svgCode.includes('</svg>')) {
        issues.push('SVG not properly closed');
    }
    else {
        score += 10;
    }
    // Check for educational content
    const textCount = (svgCode.match(/<text/g) || []).length;
    if (textCount < 3) {
        issues.push('Insufficient labels (need at least 3 text elements)');
    }
    else {
        score += Math.min(25, textCount * 5);
    }
    // Check for structure
    if (svgCode.includes('<defs>'))
        score += 10;
    if (svgCode.includes('<style>'))
        score += 10;
    if (svgCode.includes('viewBox'))
        score += 10;
    // Check for animations (bonus, not required)
    const hasAnimation = svgCode.includes('<animate') ||
        svgCode.includes('<animateMotion') ||
        svgCode.includes('<animateTransform');
    if (hasAnimation)
        score += 10;
    // Check for visual elements
    const pathCount = (svgCode.match(/<path/g) || []).length;
    const circleCount = (svgCode.match(/<circle/g) || []).length;
    const rectCount = (svgCode.match(/<rect/g) || []).length;
    const visualCount = pathCount + circleCount + rectCount;
    if (visualCount < 3) {
        issues.push('Too few visual elements (need at least 3)');
    }
    else {
        score += Math.min(20, visualCount * 2);
    }
    return {
        valid: score >= 60,
        score: Math.min(100, score),
        issues
    };
}
/**
 * MASTER GENERATION PIPELINE
 * Generates complete SVG with retry and quality validation
 */
async function generateCompleteSVG(topic, description, verticalSection, apiKey, maxRetries = 2) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logger_1.logger.info(`[SVG-COMPLETE] Attempt ${attempt}/${maxRetries} for section ${verticalSection}`);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192, // CRITICAL: Need high limit for full SVG
                topK: 40,
                topP: 0.9
            }
            // NO systemInstruction - let model generate naturally
        });
        const prompt = createCompleteSVGPrompt(topic, description, verticalSection);
        // Retry with exponential backoff for rate limiting
        let result;
        let lastError;
        for (let retryCount = 0; retryCount < 3; retryCount++) {
            try {
                if (retryCount > 0) {
                    const delayMs = retryCount * 3000; // 3s, 6s delays
                    logger_1.logger.info(`[SVG-COMPLETE] Retry ${retryCount}/2 after ${delayMs}ms delay`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
                result = await model.generateContent(prompt);
                break; // Success
            }
            catch (error) {
                lastError = error;
                if (error.message?.includes('429') || error.message?.includes('rate limit')) {
                    logger_1.logger.warn(`[SVG-COMPLETE] Rate limit hit, will retry...`);
                    continue;
                }
                throw error; // Non-rate-limit error
            }
        }
        if (!result) {
            throw lastError || new Error('Failed after retries');
        }
        try {
            if (!result || !result.response) {
                logger_1.logger.error(`[SVG-COMPLETE] No response from Gemini API`);
                throw new Error('No response from API');
            }
            if (result.response.promptFeedback?.blockReason) {
                logger_1.logger.error(`[SVG-COMPLETE] Content blocked: ${result.response.promptFeedback.blockReason}`);
                throw new Error(`Content blocked: ${result.response.promptFeedback.blockReason}`);
            }
            // Check for candidates
            if (!result.response.candidates || result.response.candidates.length === 0) {
                logger_1.logger.error(`[SVG-COMPLETE] No candidates in response`);
                logger_1.logger.error(`[SVG-COMPLETE] Response object:`, JSON.stringify(result.response, null, 2).substring(0, 500));
                throw new Error('No candidates in API response');
            }
            // Log finish reason for debugging
            const finishReason = result.response.candidates[0]?.finishReason;
            logger_1.logger.info(`[SVG-COMPLETE] Finish reason: ${finishReason}`);
            let svgCode = result.response.text();
            logger_1.logger.info(`[SVG-COMPLETE] Received ${svgCode.length} chars`);
            // Clean up the response - remove markdown
            svgCode = svgCode
                .replace(/```xml\n?/g, '')
                .replace(/```svg\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            // Log first 500 chars for debugging
            logger_1.logger.info(`[SVG-COMPLETE] Raw output (first 500 chars): ${svgCode.substring(0, 500)}`);
            // Extract SVG if wrapped in other content - IMPROVED REGEX
            const svgMatch = svgCode.match(/<\?xml[\s\S]*?<svg[\s\S]*?<\/svg>/i);
            if (svgMatch) {
                svgCode = svgMatch[0];
                logger_1.logger.info(`[SVG-COMPLETE] Extracted SVG with <?xml header`);
            }
            else {
                // Try without XML declaration
                const svgMatch2 = svgCode.match(/<svg[\s\S]*?<\/svg>/i);
                if (svgMatch2) {
                    svgCode = '<?xml version="1.0" standalone="no"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' + svgMatch2[0];
                    logger_1.logger.info(`[SVG-COMPLETE] Extracted SVG without <?xml header, added it`);
                }
                else {
                    logger_1.logger.error(`[SVG-COMPLETE] Could not find valid SVG structure in output`);
                    logger_1.logger.error(`[SVG-COMPLETE] Output was: ${svgCode.substring(0, 1000)}`);
                }
            }
            // Validate quality
            const validation = validateCompleteSVG(svgCode);
            logger_1.logger.info(`[SVG-COMPLETE] Quality Score: ${validation.score}/100`);
            if (validation.issues.length > 0) {
                logger_1.logger.warn(`[SVG-COMPLETE] Issues: ${validation.issues.join(', ')}`);
            }
            // ACCEPT if score >= 50 (reasonable threshold) OR if it has valid SVG structure
            if (validation.score >= 50) {
                logger_1.logger.info(`[SVG-COMPLETE] ✅ Quality acceptable! Score: ${validation.score}`);
                return svgCode;
            }
            // If last attempt, return anything with SVG structure
            if (attempt === maxRetries) {
                if (svgCode.includes('<svg') && svgCode.includes('</svg>')) {
                    logger_1.logger.warn(`[SVG-COMPLETE] ⚠️ Last attempt - returning SVG despite score ${validation.score}`);
                    return svgCode;
                }
            }
            // Retry if not last attempt
            if (attempt < maxRetries) {
                logger_1.logger.warn(`[SVG-COMPLETE] Score too low (${validation.score}), retrying...`);
                continue;
            }
            throw new Error(`Failed to generate valid SVG`);
        }
        catch (error) {
            logger_1.logger.error(`[SVG-COMPLETE] Attempt ${attempt} failed: ${error.message}`);
            // Handle rate limiting
            if (error.message?.includes('rate limit') || error.message?.includes('503')) {
                const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000);
                logger_1.logger.warn(`[SVG-COMPLETE] Rate limited. Waiting ${backoffTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
            if (attempt === maxRetries) {
                throw error;
            }
        }
    }
    throw new Error('Failed to generate complete SVG after all retries');
}
/**
 * Generate multiple complete SVGs for a step (one per visual concept)
 */
async function generateCompleteSVGsForStep(topic, descriptions, apiKey) {
    const svgCodes = [];
    for (let i = 0; i < descriptions.length; i++) {
        logger_1.logger.info(`[SVG-COMPLETE] Generating SVG ${i + 1}/${descriptions.length}`);
        try {
            const svgCode = await generateCompleteSVG(topic, descriptions[i], i, apiKey);
            svgCodes.push(svgCode);
        }
        catch (error) {
            logger_1.logger.error(`[SVG-COMPLETE] Failed SVG ${i + 1}: ${error.message}`);
            // Continue with other SVGs - partial success is acceptable
        }
    }
    return svgCodes;
}
exports.default = generateCompleteSVG;
