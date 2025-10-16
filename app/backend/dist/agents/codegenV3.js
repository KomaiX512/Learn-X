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
const MAX_OUTPUT_TOKENS = 30000; // Increased to avoid truncation on rich SVG outputs
// No hard timeout: let the API complete naturally
/**
 * PROVEN PATTERN - Matches user's successful blood vessel prompt
 * CRITICAL: Must explicitly request ANIMATIONS with movement
 * VISUAL CONTRAST: Canvas is BLACK - use bright colors, avoid black/dark colors
 * DESCRIPTION: Include 1-2 line figure description
 */
function createStepPrompt(step, topic) {
    return `Create an animated SVG visual for "${topic}" — ${step.desc}

Requirements:
- Use <animate>, <animateMotion>, or <animateTransform> for movement.
- Label key components with concise <text> tags (short labels only; no long narration paragraphs).
- VISUAL CONTRAST: Background is BLACK. Use bright colors (blue, cyan, white, pink, yellow, red, green). Avoid dark/black for strokes/text. Do NOT add background rectangles or large fills — keep a chalkboard aesthetic, and highlting title text color should must be of high contrast for which highlighting was.
- Emphasize visuals: arrows, shapes, paths, motion. Keep text minimal and functional.
- Pure SVG only (no HTML/CSS/JS).

Start with <?xml version="1.0"?> and output ONLY the SVG code:`;
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
                topK: 50,
                topP: 0.95
            },
            systemInstruction: 'You are an SVG code generator. Output ONLY valid SVG XML code. Never include explanations, markdown formatting, or any text outside the SVG code. Start with <?xml version="1.0"?> and include complete <svg> tags.'
        });
        const prompt = createStepPrompt(step, topic);
        logger_1.logger.debug(`[codegenV3] Prompt length: ${prompt.length} chars`);
        // Generate without artificial timeout
        const result = await model.generateContent(prompt);
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
        // CHECK FINISH REASON FIRST - before trying to extract text
        const candidate = result.response.candidates[0];
        if (candidate.finishReason) {
            logger_1.logger.debug(`[codegenV3] Finish reason: ${candidate.finishReason}`);
            // BLOCK ONLY TRUE SAFETY ISSUES
            if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
                logger_1.logger.error('[codegenV3] Content blocked by safety filters!');
                logger_1.logger.error('[codegenV3] Safety ratings:', JSON.stringify(candidate.safetyRatings));
                throw new Error('API blocked content due to safety filters');
            }
            // WARN but CONTINUE for truncation - we can use partial content
            if (candidate.finishReason === 'MAX_TOKENS' || candidate.finishReason === 'LENGTH') {
                logger_1.logger.warn('[codegenV3] Response truncated - will attempt to use partial content');
            }
        }
        // EXTRACT TEXT - manually from parts to handle ALL cases including truncated responses
        let svgCode = '';
        try {
            // PRIMARY: Try standard text() method first
            if (result.response.text) {
                svgCode = result.response.text();
            }
            // FALLBACK: If text() returns empty, extract directly from candidate parts
            if (!svgCode || svgCode.trim().length === 0) {
                logger_1.logger.warn('[codegenV3] text() returned empty, extracting from candidate.content.parts...');
                if (candidate?.content?.parts && Array.isArray(candidate.content.parts)) {
                    // Concatenate all text parts
                    svgCode = candidate.content.parts
                        .filter((part) => part.text)
                        .map((part) => part.text)
                        .join('');
                    if (svgCode && svgCode.trim().length > 0) {
                        logger_1.logger.info(`[codegenV3] ✅ Extracted ${svgCode.length} chars from candidate.content.parts`);
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.error('[codegenV3] Failed to extract text:', error.message);
            // Final attempt: log structure and try to get any text
            logger_1.logger.error('[codegenV3] Candidate structure:', JSON.stringify({
                hasContent: !!candidate?.content,
                hasParts: !!candidate?.content?.parts,
                partsLength: candidate?.content?.parts?.length,
                finishReason: candidate?.finishReason
            }));
            throw new Error(`Failed to extract text: ${error.message}`);
        }
        // VALIDATE we got SOMETHING
        if (!svgCode || svgCode.trim().length === 0) {
            logger_1.logger.error('[codegenV3] ❌ NO TEXT EXTRACTED from response');
            logger_1.logger.error('[codegenV3] Candidate:', JSON.stringify(candidate, null, 2).substring(0, 1000));
            throw new Error('No text content in API response');
        }
        logger_1.logger.debug(`[codegenV3] Received ${svgCode.length} chars from API`);
        // Clean markdown wrappers
        svgCode = svgCode
            .replace(/```xml\n?/g, '')
            .replace(/```svg\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        // STEP 1: VALIDATE we have SOME SVG structure
        if (!svgCode.includes('<svg')) {
            logger_1.logger.error('[codegenV3] ❌ NO SVG OPENING TAG');
            logger_1.logger.error('[codegenV3] Content received:');
            logger_1.logger.error(svgCode.substring(0, 1000));
            throw new Error('No <svg> tag found in generated content');
        }
        // STEP 2: COUNT TAGS for auto-repair
        const openSvgTags = (svgCode.match(/<svg/g) || []).length;
        let closeSvgTags = (svgCode.match(/<\/svg>/g) || []).length;
        logger_1.logger.debug(`[codegenV3] SVG tag count: ${openSvgTags} open, ${closeSvgTags} close`);
        // STEP 3: AUTO-REPAIR FIRST (before validation)
        if (openSvgTags > closeSvgTags) {
            const isMaxTokens = candidate?.finishReason === 'MAX_TOKENS' || candidate?.finishReason === 'LENGTH';
            logger_1.logger.warn(`[codegenV3] 🔧 AUTO-REPAIR: Missing ${openSvgTags - closeSvgTags} closing tag(s) (finishReason: ${candidate?.finishReason})`);
            // Add missing closing tags
            const missingCloseTags = openSvgTags - closeSvgTags;
            for (let i = 0; i < missingCloseTags; i++) {
                svgCode += '\n</svg>';
            }
            closeSvgTags = (svgCode.match(/<\/svg>/g) || []).length;
            logger_1.logger.info(`[codegenV3] ✅ Added ${missingCloseTags} closing </svg> tag(s)`);
        }
        // STEP 4: EXTRACT clean SVG with proper XML declaration
        const svgMatch = svgCode.match(/<\?xml[\s\S]*<\/svg>/i) ||
            svgCode.match(/<svg[\s\S]*<\/svg>/i);
        if (svgMatch) {
            svgCode = svgMatch[0];
            if (!svgCode.startsWith('<?xml')) {
                svgCode = '<?xml version="1.0" standalone="no"?>\n' + svgCode;
            }
        }
        else {
            // Fallback: wrap whatever we have
            if (!svgCode.startsWith('<?xml')) {
                svgCode = '<?xml version="1.0" standalone="no"?>\n' + svgCode;
            }
        }
        // STEP 5: FINAL VALIDATION after repair
        const finalOpenTags = (svgCode.match(/<svg/g) || []).length;
        const finalCloseTags = (svgCode.match(/<\/svg>/g) || []).length;
        if (finalOpenTags !== finalCloseTags) {
            logger_1.logger.error(`[codegenV3] ❌ MALFORMED SVG after repair - Open: ${finalOpenTags}, Close: ${finalCloseTags}`);
            logger_1.logger.error('[codegenV3] Content preview:');
            logger_1.logger.error(svgCode.substring(0, 500) + '\n...\n' + svgCode.substring(Math.max(0, svgCode.length - 500)));
            throw new Error(`Malformed SVG after repair - mismatched tags (${finalOpenTags} open, ${finalCloseTags} close)`);
        }
        // STEP 6: Check completeness (info only, don't fail)
        const lastClosingTag = svgCode.lastIndexOf('</svg>');
        const distanceFromEnd = svgCode.length - lastClosingTag - 6;
        if (distanceFromEnd > 50) {
            logger_1.logger.warn(`[codegenV3] ⚠️ ${distanceFromEnd} chars after final </svg> (possible junk content)`);
        }
        const genTime = ((Date.now() - startTime) / 1000).toFixed(2);
        // DIAGNOSTIC: Count animation tags
        const animateCount = (svgCode.match(/<animate[^>]*>/g) || []).length;
        const animateMotionCount = (svgCode.match(/<animateMotion[^>]*>/g) || []).length;
        const animateTransformCount = (svgCode.match(/<animateTransform[^>]*>/g) || []).length;
        const totalAnimations = animateCount + animateMotionCount + animateTransformCount;
        const textLabels = (svgCode.match(/<text/g) || []).length;
        const shapes = (svgCode.match(/<circle|<rect|<path|<ellipse|<polygon/g) || []).length;
        logger_1.logger.info(`[codegenV3] ✅ Generated SVG in ${genTime}s (${svgCode.length} chars)`);
        logger_1.logger.info(`[codegenV3] 🎬 ANIMATIONS: ${totalAnimations} total (<animate>: ${animateCount}, <animateMotion>: ${animateMotionCount}, <animateTransform>: ${animateTransformCount})`);
        logger_1.logger.info(`[codegenV3] 📊 CONTENT: labels=${textLabels}, shapes=${shapes}`);
        // DIAGNOSTIC: Save SVG to file for inspection
        if (totalAnimations === 0) {
            logger_1.logger.error(`[codegenV3] ❌ ZERO ANIMATIONS GENERATED! Saving output for debugging...`);
            const fs = require('fs');
            const debugPath = `/tmp/debug-step${step.id}-NO-ANIMATIONS.svg`;
            fs.writeFileSync(debugPath, svgCode);
            logger_1.logger.error(`[codegenV3] Saved to: ${debugPath}`);
        }
        else {
            logger_1.logger.info(`[codegenV3] ✅ ANIMATIONS PRESENT - Quality check passed`);
            // Save first successful one for reference
            if (step.id === 1) {
                const fs = require('fs');
                const debugPath = `/tmp/debug-step${step.id}-WITH-ANIMATIONS.svg`;
                fs.writeFileSync(debugPath, svgCode);
                logger_1.logger.info(`[codegenV3] Reference saved to: ${debugPath}`);
            }
        }
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
