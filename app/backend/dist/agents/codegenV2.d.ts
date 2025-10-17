/**
 * CODEGEN V2 - Production-Grade Code Generation with Post-Processing Pipeline
 *
 * Pipeline:
 * 1. Visual Agent V2 - Generates 30-40 decent operations
 * 2. Grid Snapper - Snaps all positions to 0.05 grid (100% alignment)
 * 3. Operation Expander - Adds visuals to reach 50-70 operations
 * 4. Generic→V2 Converter - Upgrades shapes to domain tools (60-70% V2)
 * 5. Layout Engine - Prevents text overlap
 * 6. Composition Validator - Final quality check
 *
 * NO fallbacks, TRUE dynamic generation
 */
import { Action, PlanStep } from '../types';
export interface CodegenChunk {
    type: 'actions';
    stepId: number;
    actions: Action[];
}
/**
 * Generate code/actions for a step using intelligent visual agent
 */
export declare function codegenAgentV2(step: PlanStep, topic: string): Promise<CodegenChunk | null>;
export default codegenAgentV2;
//# sourceMappingURL=codegenV2.d.ts.map