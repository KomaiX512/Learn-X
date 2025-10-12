/**
 * SVG ANIMATION GENERATOR - SIMPLIFIED
 * 
 * Uses proven user prompt pattern that generates perfect animations
 * NO complexity, NO examples, NO templates - just clear instructions
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Action } from '../types';
import { logger } from '../logger';

/**
 * SIMPLE DIRECT PROMPT - Matches user's successful pattern exactly
 */
export function createAnimationPrompt(topic: string, description: string, animationType: string): string {
  return `Write a script of code in 2D SIMPLE pure in SVG code with focused minimal clear animation of ${description} for the topic "${topic}". Code length not more than 250 lines.

The animation should depict the key concepts with actual labeled elements moving and interacting. Include labeled animations showcasing identification and movement of all relevant components.

Label all molecules, cells, structures, and concepts with synchronized movement and full-color visuals. The labels should clearly indicate the names making it educational for students. Ensure the visual experience is engaging and informative for educational purposes.

NOTE: My compiler is just SVG compiler so do ONLY pure SVG. NO surrounding HTML, external CSS, and JavaScript. Start with <?xml version="1.0"?>

OUTPUT ONLY THE PURE SVG CODE:`;
}

/**
 * MINIMAL validation - just check it's valid SVG
 */
export function validateAnimationQuality(svgCode: string): {
  valid: boolean;
  score: number;
  issues: string[];
} {
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
export async function generateSVGAnimation(
  topic: string,
  description: string,
  animationType: string,
  apiKey: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const TIMEOUT = Number(process.env.LLM_TIMEOUT_MS || 90000);
  
  logger.info(`[SVG] Generating ${animationType} for: ${topic}`);
  
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
    const result: any = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${TIMEOUT}ms`)), TIMEOUT))
    ]);

    let raw = '';
    try {
      raw = result.response.text();
    } catch {}

    if (!raw || raw.trim().length === 0) {
      const candidate: any = result?.response?.candidates?.[0];
      const parts = candidate?.content?.parts;
      if (Array.isArray(parts)) {
        raw = parts.map((p: any) => p?.text || '').join('').trim();
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
    
    logger.info(`[SVG] ✅ Generated ${svgCode.length} chars`);
    return svgCode;
    
  } catch (error: any) {
    logger.error(`[SVG] Generation failed: ${error.message}`);
    throw error; // NO FALLBACK - fail properly
  }
}

/**
 * Convert SVG animation to Action format for frontend
 */
export function svgAnimationToAction(svgCode: string, visualGroup: string = 'animation-1'): Action {
  return {
    op: 'customSVG',
    svgCode,
    visualGroup
  } as any;
}

/**
 * Generate multiple animations for a step
 */
export async function generateAnimationsForStep(
  topic: string,
  descriptions: Array<{ desc: string; type: string }>,
  apiKey: string
): Promise<Action[]> {
  const actions: Action[] = [];
  
  for (let i = 0; i < descriptions.length; i++) {
    const { desc, type } = descriptions[i];
    logger.info(`[SVG-ANIMATION] Generating animation ${i + 1}/${descriptions.length}: ${type}`);
    
    try {
      const svgCode = await generateSVGAnimation(topic, desc, type, apiKey);
      const action = svgAnimationToAction(svgCode, `animation-${i + 1}`);
      actions.push(action);
      
      // Add delay between animations
      if (i < descriptions.length - 1) {
        actions.push({ op: 'delay', ms: 2000 } as any);
      }
    } catch (error: any) {
      logger.error(`[SVG-ANIMATION] Failed to generate animation ${i + 1}: ${error.message}`);
      // Continue with other animations
    }
  }
  
  return actions;
}

export default generateSVGAnimation;
