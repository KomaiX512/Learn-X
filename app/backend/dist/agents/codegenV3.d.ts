/**
 * CODEGEN V3 - SIMPLIFIED DIRECT GENERATION
 *
 * Single-stage SVG generation matching user's proven pattern
 * NO planning complexity, NO fallbacks, trust the LLM
 */
import { Action, PlanStep } from '../types';
export interface CodegenChunk {
    type: 'actions';
    stepId: number;
    actions: Action[];
}
/**
 * SIMPLIFIED SINGLE-STAGE GENERATION
 * Direct SVG generation - trust the LLM, no planning complexity
 */
export declare function codegenV3(step: PlanStep, topic: string): Promise<CodegenChunk | null>;
export default codegenV3;
//# sourceMappingURL=codegenV3.d.ts.map