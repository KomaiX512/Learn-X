import { Action, PlanStep } from '../types';
export interface VisualChunk {
    type: 'visuals';
    stepId: number;
    actions: Action[];
}
export declare function visualAgent(step: PlanStep, topic: string): Promise<VisualChunk | null>;
//# sourceMappingURL=visual.d.ts.map