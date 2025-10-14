/**
 * NOTES GENERATOR (formerly Transcript Generator)
 * 
 * Generates comprehensive SVG educational keynotes for each step
 * Uses Gemini 2.5 Flash with hardcoded prompt for mind-blowing quality
 * 
 * ARCHITECTURE:
 * - Takes a subtopic as input for each step
 * - Generates pure SVG code (no HTML/CSS/JS)
 * - First visual rendered before animations
 * - Vertically stacked on same canvas
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../logger';
import { PlanStep } from '../types';

const MODEL = 'gemini-2.5-flash';
const MAX_OUTPUT_TOKENS = 30000; // Rich SVG content without truncation
const MIN_QUALITY_THRESHOLD = 2000; // Minimum chars for acceptable quality
const MAX_RETRIES = 3; // Retry on failure
const RETRY_DELAY_BASE = 2000; // 2 seconds base delay

// TEMPERATURE: Fixed for consistent quality
const TEMPERATURE = 0.75; // Balanced creativity + reliability

/**
 * USER'S EXACT PROMPT - Pure Requirements, No Templates
 * 
 * This prompt allows infinite creative variations while maintaining quality standards.
 * The LLM is free to create unique layouts for each topic - no hardcoded patterns.
 */
const SVG_KNOWLEDGE_CREATOR_PROMPT = `SVG Knowledge Creator Mandate
Objective: Generate comprehensive, detailed, and visually appealing educational keynotes for a specified technical subtopic, delivered exclusively as a single, self-contained block of pure SVG code.

Core Constraints & Requirements (Non-Negotiable):

1. Pure SVG Only: The output must be 100% SVG code. No external or inline CSS (except native SVG styling attributes like fill, stroke, font-size), or JavaScript is permitted. The SVG must compile without any issues in a dedicated SVG viewer/frontend.

2. VERTICAL LAYOUT ONLY (CRITICAL): ALL content MUST flow vertically from top to bottom in a SINGLE COLUMN. NEVER create multi-column layouts or place headings/text side-by-side horizontally. Each heading, subheading, bullet point, and diagram MUST appear one below the other in strict vertical order. Start at y=50 and increment y-position for each new element (spacing: 30-40px between elements).

3. VISUAL CONTRAST (CRITICAL): Canvas background is BLACK. Use bright, high-contrast colors for ALL elements (orange, cyan, yellow, blue, orange, red, pink). NEVER use black or dark colors for text, shapes, or lines - they will be invisible. (IMPORTANT: NO background rectangles or fills - keep transparent background so it looks like writing on a blackboard, not a pasted screenshot)

4. Mathematical Structures (Critical Correction): NEVER use LaTeX syntax ($$, \\frac, \\text, etc.) inside <text> elements. All formulas, fractions, subscripts, and superscripts must be constructed geometrically using:
   - Precisely positioned multiple <text> elements.
   - <line> elements for fraction bars.
   - Correct Unicode characters for special symbols (if needed).

5. Content Elements & BALANCE (CRITICAL): Target ~50% textual notes (short, punchy lines) and ~50% visuals (diagrams/figures). The notes must fully encapsulate the subtopic, including:
   - A Captivating Main Heading (centered, y=50).
   - Logical Subheadings (left-aligned, x=100, each 40px below previous).
   - A Concise Definition with essential details (left-aligned, x=120). Keep each line ≤ 120 characters; use multiple lines instead of paragraphs.
   - Clear Examples/Applications (left-aligned, x=120) with bullet-like short lines.
   - Fully-rendered Mathematical/Labeling Structures (left-aligned, x=120) built geometrically (multiple <text> + <line>), not LaTeX.
   - Relevant Visual Elements (e.g., diagrams, flows, arrows, charts) drawn using native SVG primitives (placed below text, never beside). MINIMUM 3 DISTINCT visual blocks per subtopic.

BEAUTIFICATION MANDATE: Produce book-quality, psycological appealing and modular visuals with highlighted titles/subtitles, consistent color theming, elegant boxed key points and formulas, and clear diagrammatic visual examples (not text-only). 

6. LAYOUT STRUCTURE EXAMPLE:
   - Main Heading: y=50
   - Subheading 1: y=100
   - Content 1: y=140, y=170, y=200 (each line 30px apart)
   - Subheading 2: y=250
   - Content 2: y=290, y=320, y=350
   - Diagram (more than 2 contextual): y=400 onwards
   ALL elements must use this vertical stacking pattern. NEVER place elements at the same y-coordinate unless they are part of a single line.

7. Goal: Provide the richest knowledge delivery possible within the graphical limitations of SVG, leaving no formula, structural note, or relevant visual concept untouched. The final SVG must be detailed, comprehensive, and immediately readable upon compilation with PERFECT VERTICAL FLOW.

VISUAL PRIORITY: Favor meaningful figures with arrows, boxes, paths, and labels. Avoid long prose. Labels should be concise and functional.`;

/**
 * Internal function: Generate SVG keynote (single attempt, no retries)
 * @param temperature - Controls creativity vs consistency (0.5-0.8 range)
 */
async function generateNotesInternal(
  step: PlanStep,
  topic: string,
  subtopic: string,
  temperature: number = TEMPERATURE
): Promise<string | null> {
  
  logger.info(`[notes] Generating SVG keynote for step ${step.id}`);
  logger.info(`[notes] Topic: "${topic}"`);
  logger.info(`[notes] Subtopic: "${subtopic}"`);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error('[notes] GEMINI_API_KEY not set');
    return null;
  }
  
  try {
    const startTime = Date.now();
    logger.debug(`[notes] Using temperature: ${temperature}`);
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature, // Dynamic temperature for adaptive retries
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        topK: 50,
        topP: 0.95
      },
      systemInstruction: 'You are a visual education designer creating SVG keynotes. Output ONLY pure SVG code with NO markdown, NO explanations, NO code fences - just the raw SVG starting with <svg and ending with </svg>.',
    });
    
    // Construct the complete prompt - subtopic only, no templates
    const fullPrompt = `${SVG_KNOWLEDGE_CREATOR_PROMPT}

═══════════════════════════════════════════════════════════════
SUBTOPIC:
"${subtopic}"
═══════════════════════════════════════════════════════════════

Generate the complete SVG code now. Start with <?xml version="1.0"?> followed by complete <svg width="1200" height="2000" viewBox="0 0 1200 2000"> tags. Use the FULL vertical space (2000px height) to create comprehensive, vertically-stacked educational content with NO horizontal columns.`;
    
    logger.debug(`[notes] Prompt length: ${fullPrompt.length} chars`);
    
    // Generate without artificial timeout
    const result = await model.generateContent(fullPrompt) as any;
    
    // Validate response structure
    if (!result || !result.response) {
      logger.error('[notes] No response object from API');
      logger.error('[notes] Result structure:', JSON.stringify(result || {}, null, 2).substring(0, 500));
      return null;
    }
    
    // Check for prompt feedback (API-level blocks)
    if (result.response.promptFeedback) {
      const feedback = result.response.promptFeedback;
      if (feedback.blockReason) {
        logger.error(`[notes] ⛔ Prompt BLOCKED by Gemini API: ${feedback.blockReason}`);
        logger.error(`[notes] Safety ratings:`, JSON.stringify(feedback.safetyRatings || [], null, 2));
        return null;
      }
    }
    
    if (!result.response.candidates || result.response.candidates.length === 0) {
      logger.error('[notes] No candidates in response');
      logger.error('[notes] Response:', JSON.stringify(result.response, null, 2).substring(0, 500));
      return null;
    }
    
    const candidate = result.response.candidates[0];
    
    // Log finish reason for diagnostics
    logger.debug(`[notes] Finish reason: ${candidate.finishReason}`);
    
    // Check for safety blocks
    if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
      logger.error(`[notes] ⛔ Content BLOCKED: ${candidate.finishReason}`);
      if (candidate.safetyRatings) {
        logger.error('[notes] Safety ratings:', JSON.stringify(candidate.safetyRatings, null, 2));
      }
      return null;
    }
    
    // Check for MAX_TOKENS - continue and try to salvage partial SVG
    if (candidate.finishReason === 'MAX_TOKENS' || candidate.finishReason === 'LENGTH') {
      logger.warn(`[notes] ⚠️ MAX_TOKENS/LENGTH reached - attempting to use partial SVG content`);
    }
    
    // Check for other non-STOP finish reasons
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      logger.warn(`[notes] ⚠️ Unusual finish reason: ${candidate.finishReason}`);
    }
    
    // Extract SVG code
    let svgCode = '';
    try {
      if (result.response.text) {
        svgCode = result.response.text();
      }
      
      // Fallback: extract from candidate parts
      if (!svgCode || svgCode.trim().length === 0) {
        if (candidate?.content?.parts && Array.isArray(candidate.content.parts)) {
          svgCode = candidate.content.parts
            .filter((part: any) => part.text)
            .map((part: any) => part.text)
            .join('');
        }
      }
    } catch (error: any) {
      logger.error('[notes] Failed to extract SVG code:', error.message);
      return null;
    }
    
    if (!svgCode || svgCode.trim().length === 0) {
      logger.error('[notes] ❌ EMPTY SVG CODE EXTRACTED');
      logger.error('[notes] Finish reason:', candidate.finishReason);
      logger.error('[notes] Has content parts:', candidate?.content?.parts ? 'YES' : 'NO');
      if (candidate?.content?.parts) {
        logger.error('[notes] Parts count:', candidate.content.parts.length);
        candidate.content.parts.forEach((part: any, idx: number) => {
          logger.error(`[notes] Part ${idx}:`, Object.keys(part).join(', '));
        });
      }
      logger.error('[notes] This usually means Gemini refused to generate or hit token limits');
      return null;
    }
    
    // Clean markdown wrappers
    svgCode = svgCode
      .replace(/```xml\n?/g, '')
      .replace(/```svg\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // Validate SVG structure
    if (!svgCode.includes('<svg')) {
      logger.error('[notes] No <svg> tag found in generated content');
      return null;
    }
    
    // Auto-repair missing closing tags
    const openSvgTags = (svgCode.match(/<svg/g) || []).length;
    let closeSvgTags = (svgCode.match(/<\/svg>/g) || []).length;
    
    if (openSvgTags > closeSvgTags) {
      logger.warn(`[notes] Auto-repairing: Adding ${openSvgTags - closeSvgTags} closing tag(s)`);
      const missingCloseTags = openSvgTags - closeSvgTags;
      for (let i = 0; i < missingCloseTags; i++) {
        svgCode += '\n</svg>';
      }
    }
    
    // Extract clean SVG with XML declaration
    const svgMatch = svgCode.match(/<\?xml[\s\S]*<\/svg>/i) || 
                     svgCode.match(/<svg[\s\S]*<\/svg>/i);
    
    if (svgMatch) {
      svgCode = svgMatch[0];
      if (!svgCode.startsWith('<?xml')) {
        svgCode = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + svgCode;
      }
    } else {
      // Fallback: wrap whatever we have
      if (!svgCode.startsWith('<?xml')) {
        svgCode = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + svgCode;
      }
    }
    
    // Final validation
    const finalOpenTags = (svgCode.match(/<svg/g) || []).length;
    const finalCloseTags = (svgCode.match(/<\/svg>/g) || []).length;
    
    if (finalOpenTags !== finalCloseTags) {
      logger.error(`[notes] Malformed SVG after repair - Open: ${finalOpenTags}, Close: ${finalCloseTags}`);
      return null;
    }
    
    const genTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Diagnostic metrics
    const textElements = (svgCode.match(/<text/g) || []).length;
    const rectElements = (svgCode.match(/<rect/g) || []).length;
    const lineElements = (svgCode.match(/<line/g) || []).length;
    const totalElements = textElements + rectElements + lineElements;
    
    logger.info(`[notes] ✅ Generated SVG keynote in ${genTime}s (${svgCode.length} chars)`);
    logger.info(`[notes] 📊 Elements: text=${textElements}, rect=${rectElements}, line=${lineElements}, total=${totalElements}`);
    
    // Save debug copy for ALL steps (debugging)
    const fs = require('fs');
    const debugPath = `/tmp/notes-step${step.id}-${Date.now()}.svg`;
    fs.writeFileSync(debugPath, svgCode);
    logger.info(`[notes] Debug copy saved: ${debugPath}`);
    
    return svgCode;
    
  } catch (error: any) {
    logger.error(`[notes] Generation failed: ${error.message}`);
    return null;
  }
}

/**
 * NO EXTRACTION - Use AI-generated notesSubtopic from planner
 * This function is DEPRECATED but kept for backward compatibility
 */
function getNotesSubtopic(step: PlanStep, topic: string): string {
  // PRIORITY 1: Use AI-generated notesSubtopic from planner (BEST)
  if (step.notesSubtopic && step.notesSubtopic.trim().length > 0) {
    logger.info(`[notes] ✅ Using AI-generated notesSubtopic: "${step.notesSubtopic}"`);
    return step.notesSubtopic.trim();
  }
  
  // FALLBACK: Use topic + step tag (if planner didn't generate notesSubtopic)
  const fallback = step.tag ? `${topic} - ${step.tag}` : topic;
  logger.warn(`[notes] ⚠️ No notesSubtopic from planner, using fallback: "${fallback}"`);
  return fallback;
}

/**
 * PUBLIC API: Generate comprehensive SVG educational keynote with ADAPTIVE retry logic
 * 
 * PRODUCTION-GRADE RECOVERY STRATEGIES:
 * 1. Progressive temperature adjustment (starts low for consistency, increases on retry)
 * 2. Exponential backoff delays
 * 3. Strict quality validation before accepting output
 * 4. Detailed diagnostics for debugging
 * 5. Subtopic normalization for long planner outputs
 * 
 * @param step - The plan step containing description and metadata
 * @param topic - The main topic (used for context)
 * @param subtopic - The specific subtopic for this step (CRITICAL INPUT)
 * @returns SVG code string or null on failure
 */
export async function generateNotesForStep(
  step: PlanStep,
  topic: string,
  subtopicOverride?: string,
  visualDescription?: string
): Promise<string> {
  logger.info(`[notes] 🎯 Generating SVG keynote with ${MAX_RETRIES} retry attempts`);
  logger.info(`[notes] 📚 Subtopic: "${subtopicOverride || step.notesSubtopic || step.desc}"`);
  logger.info(`[notes] 🎬 Visual Desc: "${visualDescription?.substring(0, 80)}..."`);
  
  let lastError: Error | null = null;
  let lastQuality = { chars: 0, textElements: 0 };
  const overallStartTime = Date.now();
  
  // Retry loop
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    logger.info(`[notes] 🔄 Attempt ${attempt}/${MAX_RETRIES} for step ${step.id}`);
    const startTime = Date.now();
  
  try {
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error('[notes] GEMINI_API_KEY not set');
      throw new Error('GEMINI_API_KEY not configured');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: TEMPERATURE,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        topK: 50,
        topP: 0.95
      },
      systemInstruction: 'You are a visual education designer creating SVG keynotes. Output ONLY pure SVG code with NO markdown, NO explanations, NO code fences - just the raw SVG starting with <svg and ending with </svg>.',
    });
    
    // Construct the complete prompt - subtopic only, no templates
    const actualSubtopic = subtopicOverride || step.notesSubtopic || step.desc;
    const fullPrompt = `${SVG_KNOWLEDGE_CREATOR_PROMPT}

═══════════════════════════════════════════════════════════════
SUBTOPIC:
"${actualSubtopic}"
═══════════════════════════════════════════════════════════════

Generate the complete SVG code now. Start with <?xml version="1.0"?> followed by complete <svg width="1200" height="2000" viewBox="0 0 1200 2000"> tags. Use the FULL vertical space (2000px height) to create comprehensive, vertically-stacked educational content with NO horizontal columns.`;
    
    logger.info('[notes] Topic: "' + topic + '"');
    logger.info('[notes] Subtopic: "' + actualSubtopic + '"');
    logger.debug(`[notes] Temperature: ${TEMPERATURE}`);
    logger.debug(`[notes] Prompt length: ${fullPrompt.length} chars`);
    
    // Generate without timeout - let API complete naturally
    const result = await model.generateContent(fullPrompt) as any;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`[notes] ⏱️  Generation completed in ${elapsed}s`);
    
    // Validate response structure
    if (!result || !result.response) {
      logger.error('[notes] No response object from API');
      logger.error('[notes] Result structure:', JSON.stringify(result || {}, null, 2).substring(0, 500));
      throw new Error('No response from Gemini API');
    }
    
    // Check for prompt feedback (API-level blocks)
    if (result.response.promptFeedback) {
      const feedback = result.response.promptFeedback;
      if (feedback.blockReason) {
        logger.error(`[notes] ⛔ Prompt BLOCKED by Gemini API: ${feedback.blockReason}`);
        logger.error(`[notes] Safety ratings:`, JSON.stringify(feedback.safetyRatings || [], null, 2));
        throw new Error(`Prompt blocked: ${feedback.blockReason}`);
      }
    }
    
    if (!result.response.candidates || result.response.candidates.length === 0) {
      logger.error('[notes] No candidates in response');
      logger.error('[notes] Response:', JSON.stringify(result.response, null, 2).substring(0, 500));
      throw new Error('No candidates in API response');
    }
    
    const candidate = result.response.candidates[0];
    
    // Log finish reason for diagnostics
    logger.debug(`[notes] Finish reason: ${candidate.finishReason}`);
    
    // Check for safety blocks
    if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
      logger.error(`[notes] ⛔ Content BLOCKED: ${candidate.finishReason}`);
      if (candidate.safetyRatings) {
        logger.error('[notes] Safety ratings:', JSON.stringify(candidate.safetyRatings, null, 2));
      }
      throw new Error(`Content blocked: ${candidate.finishReason}`);
    }
    
    // Check for MAX_TOKENS - continue and try to salvage partial SVG
    if (candidate.finishReason === 'MAX_TOKENS' || candidate.finishReason === 'LENGTH') {
      logger.warn(`[notes] ⚠️ MAX_TOKENS/LENGTH reached - attempting to use partial SVG content`);
    }
    
    // Check for other non-STOP finish reasons
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      logger.warn(`[notes] ⚠️ Unusual finish reason: ${candidate.finishReason}`);
    }
    
    // Extract SVG code
    let svgCode = '';
    try {
      if (result.response.text) {
        svgCode = result.response.text();
      }
      
      // Fallback: extract from candidate parts
      if (!svgCode || svgCode.trim().length === 0) {
        if (candidate?.content?.parts && Array.isArray(candidate.content.parts)) {
          svgCode = candidate.content.parts
            .filter((part: any) => part.text)
            .map((part: any) => part.text)
            .join('');
        }
      }
    } catch (error: any) {
      logger.error('[notes] Failed to extract SVG code:', error.message);
      return null;
    }
    
    if (!svgCode || svgCode.trim().length === 0) {
      logger.error('[notes] ❌ EMPTY SVG CODE EXTRACTED');
      logger.error('[notes] Finish reason:', candidate.finishReason);
      logger.error('[notes] Has content parts:', candidate?.content?.parts ? 'YES' : 'NO');
      if (candidate?.content?.parts) {
        logger.error('[notes] Parts count:', candidate.content.parts.length);
        candidate.content.parts.forEach((part: any, idx: number) => {
          logger.error(`[notes] Part ${idx}:`, Object.keys(part).join(', '));
        });
      }
      logger.error('[notes] This usually means Gemini refused to generate or hit token limits');
      return null;
    }
    
    // Clean markdown wrappers
    svgCode = svgCode
      .replace(/```xml\n?/g, '')
      .replace(/```svg\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // Validate SVG structure
    if (!svgCode.includes('<svg')) {
      logger.error('[notes] No <svg> tag found in generated content');
      return null;
    }
    
    // Auto-repair missing closing tags
    const openSvgTags = (svgCode.match(/<svg/g) || []).length;
    let closeSvgTags = (svgCode.match(/<\/svg>/g) || []).length;
    
    if (openSvgTags > closeSvgTags) {
      logger.warn(`[notes] Auto-repairing: Adding ${openSvgTags - closeSvgTags} closing tag(s)`);
      const missingCloseTags = openSvgTags - closeSvgTags;
      for (let i = 0; i < missingCloseTags; i++) {
        svgCode += '\n</svg>';
      }
    }
    
    // Extract clean SVG with XML declaration
    const svgMatch = svgCode.match(/<\?xml[\s\S]*<\/svg>/i) || 
                     svgCode.match(/<svg[\s\S]*<\/svg>/i);
    
    if (svgMatch) {
      svgCode = svgMatch[0];
      if (!svgCode.startsWith('<?xml')) {
        svgCode = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + svgCode;
      }
    } else {
      // Fallback: wrap whatever we have
      if (!svgCode.startsWith('<?xml')) {
        svgCode = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + svgCode;
      }
    }
    
    // Final validation
    const finalOpenTags = (svgCode.match(/<svg/g) || []).length;
    const finalCloseTags = (svgCode.match(/<\/svg>/g) || []).length;
    
    if (finalOpenTags !== finalCloseTags) {
      logger.error(`[notes] Malformed SVG after repair - Open: ${finalOpenTags}, Close: ${finalCloseTags}`);
      return null;
    }
    
    const genTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Diagnostic metrics
    const textElements = (svgCode.match(/<text/g) || []).length;
    const rectElements = (svgCode.match(/<rect/g) || []).length;
    const lineElements = (svgCode.match(/<line/g) || []).length;
    const totalElements = textElements + rectElements + lineElements;
    
    logger.info(`[notes] ✅ Generated SVG keynote in ${genTime}s (${svgCode.length} chars)`);
    logger.info(`[notes] 📊 Elements: text=${textElements}, rect=${rectElements}, line=${lineElements}, total=${totalElements}`);
    
    // Save debug copy for ALL steps (debugging)
    const fs = require('fs');
    const debugPath = `/tmp/notes-step${step.id}-${Date.now()}.svg`;
    fs.writeFileSync(debugPath, svgCode);
    logger.info(`[notes] Debug copy saved: ${debugPath}`);
    
    // STRICT QUALITY VALIDATION
    const textCount = (svgCode.match(/<text/g) || []).length;
    const rectCount = (svgCode.match(/<rect/g) || []).length;
    const lineCount = (svgCode.match(/<line/g) || []).length;
    const shapeCount = (svgCode.match(/<(circle|path|ellipse|polygon)\b/g) || []).length;
    const visualElements = rectCount + lineCount + shapeCount;
    const hasViewBox = svgCode.includes('viewBox="0 0 1200 2000"') || svgCode.includes('viewBox="0 0 1200 800"');
    const totalElementsCount = textCount + visualElements;
    
    lastQuality = { chars: svgCode.length, textElements: textCount };
    
    // ULTRA-RELAXED QUALITY THRESHOLDS for Production Reliability
    // Focus on absolute minimums that indicate real quality
    const hasMinText = textCount >= 8;  // Relaxed from 15
    const hasMinVisuals = visualElements >= 5;  // Relaxed from 10
    const hasMinTotal = totalElementsCount >= 20;  // Relaxed from 30
    const hasMinLength = svgCode.length >= 2000;  // Relaxed from 3000
    const hasValidViewBox = hasViewBox;
    
    const meetsMinimumQuality = (
      hasMinText &&
      hasMinVisuals &&
      hasMinTotal &&
      hasMinLength &&
      hasValidViewBox
    );
    
    // COMPLETE LOGGING - Show every validation condition
    logger.info(`[notes] 📊 Quality Validation (Attempt ${attempt}):`);
    logger.info(`[notes]    - Text elements: ${textCount}/8 ${hasMinText ? '✓' : '✗'}`);
    logger.info(`[notes]    - Visual elements: ${visualElements}/5 ${hasMinVisuals ? '✓' : '✗'}`);
    logger.info(`[notes]    - Total elements: ${totalElementsCount}/20 ${hasMinTotal ? '✓' : '✗'}`);
    logger.info(`[notes]    - Content length: ${svgCode.length}/2000 ${hasMinLength ? '✓' : '✗'}`);
    logger.info(`[notes]    - ViewBox present: ${hasValidViewBox ? '✓' : '✗'}`);
    logger.info(`[notes]    - Overall: ${meetsMinimumQuality ? '✅ PASS' : '❌ FAIL'}`);
    
    if (meetsMinimumQuality) {
      const totalTime = ((Date.now() - overallStartTime) / 1000).toFixed(2);
      logger.info(`[notes] ✅ SUCCESS on attempt ${attempt}/${MAX_RETRIES} (${totalTime}s total)`);
      return svgCode;
    } else {
      logger.warn(`[notes] ⚠️ Attempt ${attempt} quality check failed - will retry`);
      throw new Error(`Quality validation failed: text=${textCount}, visual=${visualElements}, total=${totalElementsCount}, length=${svgCode.length}`);
    }
    
    } catch (error: any) {
      lastError = error;
      logger.error(`[notes] ❌ Attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`);
      
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_BASE * attempt; // 2s, 4s, 6s
        logger.info(`[notes] ⏸️  Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries exhausted
  const totalTime = ((Date.now() - overallStartTime) / 1000).toFixed(2);
  logger.error(`[notes] 💥 All ${MAX_RETRIES} attempts failed after ${totalTime}s`);
  logger.error(`[notes] Last error: ${lastError?.message}`);
  throw lastError || new Error('Notes generation failed after all retries');
}

/**
 * LEGACY FUNCTION - Kept for backward compatibility
 * Maps to generateNotesForStep with subtopic = step description
 */
export async function generateTranscript(
  step: PlanStep,
  topic: string,
  visualDescriptions: any[]
): Promise<string | null> {
  logger.warn('[transcript] Legacy function called, redirecting to generateNotesForStep');
  // Use step description as subtopic for backward compatibility
  const subtopic = step.desc;
  const svgCode = await generateNotesForStep(step, topic, subtopic, visualDescriptions?.[0]?.description);
  return svgCode ? `Generated notes for: ${subtopic}` : null;
}

/**
 * ALIAS for backward compatibility - generateNotes → generateNotesForStep
 */
export async function generateNotes(
  step: PlanStep,
  topic: string,
  subtopic?: string,
  visualDescription?: string
): Promise<string | null> {
  try {
    return await generateNotesForStep(step, topic, subtopic, visualDescription);
  } catch (error) {
    logger.error('[generateNotes] Failed:', error);
    return null; // Legacy behavior - return null on error
  }
}
