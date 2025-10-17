/**
 * SVG ANIMATION GENERATOR - SIMPLIFIED
 *
 * Uses proven user prompt pattern that generates perfect animations
 * NO complexity, NO examples, NO templates - just clear instructions
 */
import { Action } from '../types';
/**
 * SIMPLE DIRECT PROMPT - Matches user's successful pattern exactly
 */
export declare function createAnimationPrompt(topic: string, description: string, animationType: string): string;
/**
 * MINIMAL validation - just check it's valid SVG
 */
export declare function validateAnimationQuality(svgCode: string): {
    valid: boolean;
    score: number;
    issues: string[];
};
/**
 * SIMPLIFIED GENERATION - Trust the LLM, single attempt
 */
export declare function generateSVGAnimation(topic: string, description: string, animationType: string, apiKey: string): Promise<string>;
/**
 * Convert SVG animation to Action format for frontend
 */
export declare function svgAnimationToAction(svgCode: string, visualGroup?: string): Action;
/**
 * Generate multiple animations for a step
 */
export declare function generateAnimationsForStep(topic: string, descriptions: Array<{
    desc: string;
    type: string;
}>, apiKey: string): Promise<Action[]>;
export default generateSVGAnimation;
//# sourceMappingURL=svgAnimationGenerator.d.ts.map