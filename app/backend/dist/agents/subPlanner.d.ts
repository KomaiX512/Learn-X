/**
 * SUB-PLANNER AGENT - ENFORCES DIVERSE VISUAL ASPECTS
 *
 * Generates 4 COMPLEMENTARY visual descriptions for a single step
 * Each visual MUST cover a DIFFERENT aspect to avoid repetition
 */
import { PlanStep } from '../types';
export interface VisualScript {
    type: 'structure' | 'mechanism' | 'analysis' | 'context';
    title: string;
    description: string;
    focus: string;
    mustInclude: string[];
}
export interface SubPlan {
    stepId: number;
    visualScripts: VisualScript[];
}
export declare function subPlannerAgent(step: PlanStep, topic: string): Promise<SubPlan | null>;
//# sourceMappingURL=subPlanner.d.ts.map