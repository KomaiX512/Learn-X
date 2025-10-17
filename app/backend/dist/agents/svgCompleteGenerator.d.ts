/**
 * COMPLETE SVG GENERATOR
 *
 * Generates FULL SVG documents (not operations) with proper structure
 * Similar to the blood vessel example - complete, self-contained, educational
 *
 * Output: <?xml...><svg>...</svg> with animations, labels, structure
 */
/**
 * Create a detailed prompt for COMPLETE SVG generation
 * Modeled after successful user pattern - detailed, specific, educational
 */
export declare function createCompleteSVGPrompt(topic: string, description: string, verticalSection: number): string;
/**
 * Validate complete SVG quality
 */
export declare function validateCompleteSVG(svgCode: string): {
    valid: boolean;
    score: number;
    issues: string[];
};
/**
 * MASTER GENERATION PIPELINE
 * Generates complete SVG with retry and quality validation
 */
export declare function generateCompleteSVG(topic: string, description: string, verticalSection: number, apiKey: string, maxRetries?: number): Promise<string>;
/**
 * Generate multiple complete SVGs for a step (one per visual concept)
 */
export declare function generateCompleteSVGsForStep(topic: string, descriptions: string[], apiKey: string): Promise<string[]>;
export default generateCompleteSVG;
//# sourceMappingURL=svgCompleteGenerator.d.ts.map