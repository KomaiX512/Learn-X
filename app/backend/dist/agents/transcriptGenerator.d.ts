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
import { PlanStep } from '../types';
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
export declare function generateNotesForStep(step: PlanStep, topic: string, subtopicOverride?: string, visualDescription?: string): Promise<string>;
/**
 * LEGACY FUNCTION - Kept for backward compatibility
 * Maps to generateNotesForStep with subtopic = step description
 */
export declare function generateTranscript(step: PlanStep, topic: string, visualDescriptions: any[]): Promise<string | null>;
/**
 * ALIAS for backward compatibility - generateNotes → generateNotesForStep
 */
export declare function generateNotes(step: PlanStep, topic: string, subtopic?: string, visualDescription?: string): Promise<string | null>;
//# sourceMappingURL=transcriptGenerator.d.ts.map