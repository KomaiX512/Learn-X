/**
 * NARRATION GENERATOR - Optimized for Efficient Batch Processing
 *
 * Generates spoken narration text for all visuals in a step using ONE API call.
 * Designed to work with text-to-speech systems for educational content delivery.
 *
 * ARCHITECTURE:
 * - Input: All SVG codes for a step (notes + animations)
 * - Output: Structured narration for each visual
 * - One API call per step (not per visual)
 * - Runs in parallel with visual generation
 */
import { PlanStep } from '../types';
export interface VisualInput {
    type: 'notes' | 'animation';
    visualNumber: number;
    svgCode?: string;
    actionCount?: number;
    description?: string;
}
export interface NarrationOutput {
    visualNumber: number;
    type: 'notes' | 'animation';
    narration: string;
    duration?: number;
}
export interface StepNarration {
    stepId: number;
    topic: string;
    subtopic: string;
    narrations: NarrationOutput[];
    totalDuration: number;
}
/**
 * Generate narrations for all visuals in a step (ONE API CALL)
 */
export declare function generateStepNarration(step: PlanStep, topic: string, visuals: VisualInput[]): Promise<StepNarration>;
/**
 * Generate narration for a single visual (legacy support)
 * Note: Prefer generateStepNarration for better efficiency
 */
export declare function generateSingleNarration(step: PlanStep, topic: string, visual: VisualInput): Promise<NarrationOutput>;
/**
 * Batch generate narrations for multiple steps (advanced optimization)
 */
export declare function generateBatchNarrations(steps: Array<{
    step: PlanStep;
    topic: string;
    visuals: VisualInput[];
}>): Promise<StepNarration[]>;
/**
 * ============================================================================
 * CLARIFICATION NARRATION GENERATOR
 * ============================================================================
 * Generates visual-focused, friendly transcript for Q&A clarification SVGs
 * Called after clarifier generates SVG response to student question
 */
export interface ClarificationNarrationInput {
    question: string;
    svgActions: any[];
    topic: string;
    stepContext?: string;
}
export interface ClarificationNarrationOutput {
    narration: string;
    duration: number;
    wordCount: number;
}
/**
 * Generate clarification narration for Q&A responses
 * This provides the "voice" for clarification visuals
 */
export declare function generateClarificationNarration(input: ClarificationNarrationInput): Promise<ClarificationNarrationOutput>;
//# sourceMappingURL=narrationGenerator.d.ts.map