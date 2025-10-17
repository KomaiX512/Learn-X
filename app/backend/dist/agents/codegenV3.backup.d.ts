/**
 * CODEGEN V3 - MULTI-AGENT PURE GENERATION
 *
 * NO hardcoded operations
 * NO validation rules
 * 100% LLM creativity
 */
import { Action, PlanStep } from '../types';
/**
 * Visual Specification with type information
 */
export interface VisualSpec {
    description: string;
    type: 'static' | 'animation';
    animationType?: 'flow' | 'orbit' | 'pulse' | 'wave' | 'mechanical';
}
export interface CodegenChunk {
    type: 'actions';
    stepId: number;
    actions: Action[];
}
/**
 * ENHANCED VISUAL PLANNER WITH ANIMATION SUPPORT
 *
 * Creates 5-7 visual specifications, marking 2-3 as animations
 * Returns structured specs with type information
 */
export declare function planVisualsEnhanced(step: PlanStep, topic: string, apiKey: string): Promise<VisualSpec[]>;
/**
 * PRECISION-GUIDED TWO-STAGE PIPELINE
 *
 * Stage 1: SubPlanner creates 5-7 ultra-detailed specifications
 * Stage 2: Visual Executor generates operations for each spec (parallel)
 *
 * NO fallbacks, NO templates, 100% contextual true generation
 */
export declare function codegenV3(step: PlanStep, topic: string): Promise<CodegenChunk | null>;
export default codegenV3;
//# sourceMappingURL=codegenV3.backup.d.ts.map