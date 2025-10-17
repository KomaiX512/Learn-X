import { Action, PlanStep } from '../types';
export interface CodegenChunk {
    type: 'actions';
    stepId: number;
    actions: Action[];
}
export declare function codegenAgent(step: PlanStep, topic: string): Promise<CodegenChunk | null>;
//# sourceMappingURL=codegen.d.ts.map