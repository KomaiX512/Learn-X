import { Action, PlanStep } from '../types';
export interface TextChunk {
    type: 'text';
    stepId: number;
    actions: Action[];
}
export declare function textAgent(step: PlanStep, topic: string): Promise<TextChunk>;
//# sourceMappingURL=text.d.ts.map