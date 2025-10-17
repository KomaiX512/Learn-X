/**
 * SVG MASTER GENERATOR
 *
 * Creates INSANE quality visuals that beat 3Blue1Brown
 * Uses advanced SVG techniques for mind-blowing educational content
 */
import { Action } from '../types';
/**
 * INSANE QUALITY PROMPT GENERATOR
 * Creates prompts that force Gemini to generate COMPLEX, BEAUTIFUL SVG
 */
export declare function createInsaneQualityPrompt(topic: string, description: string): string;
/**
 * QUALITY VALIDATOR
 * Ensures generated operations meet our INSANE quality standards
 */
export declare function validateQuality(operations: Action[]): {
    valid: boolean;
    score: number;
    issues: string[];
};
/**
 * MASTER GENERATION PIPELINE
 * Generates INSANE quality visuals with retry and quality validation
 */
export declare function generateInsaneVisuals(topic: string, description: string, apiKey: string, maxRetries?: number): Promise<Action[]>;
/**
 * SPECIALIZED GENERATORS FOR DIFFERENT TOPICS
 */
export declare const TopicSpecializations: {
    biology: (topic: string) => string;
    chemistry: (topic: string) => string;
    physics: (topic: string) => string;
    mathematics: (topic: string) => string;
};
export default generateInsaneVisuals;
//# sourceMappingURL=svgMasterGenerator.d.ts.map