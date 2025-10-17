/**
 * VISUAL AGENT V2 - PRODUCTION GRADE DYNAMIC VISUAL ENGINE
 *
 * This agent INTELLIGENTLY SELECTS visualization tools based on content.
 * NO hardcoding for specific topics. TRUE dynamic generation.
 */
import { Action, PlanStep } from '../types';
/**
 * Main visual agent v2 with intelligent tool selection
 */
export declare function visualAgentV2(step: PlanStep, topic: string, previousSteps?: string[]): Promise<{
    type: 'visuals';
    stepId: number;
    actions: Action[];
} | null>;
export default visualAgentV2;
//# sourceMappingURL=visualAgentV2.d.ts.map