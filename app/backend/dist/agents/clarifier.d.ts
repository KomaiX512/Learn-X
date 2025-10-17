/**
 * Clarifier Agent
 * Generates contextual clarification for student questions during lecture
 */
import { Plan } from '../types';
export interface ClarificationRequest {
    query: string;
    step: any;
    question: string;
    screenshot?: string;
    plan: Plan;
}
export interface ClarificationResult {
    title: string;
    explanation: string;
    actions: any[];
}
/**
 * Generate contextual clarification based on student question
 */
export declare function clarifierAgent(request: ClarificationRequest): Promise<ClarificationResult>;
//# sourceMappingURL=clarifier.d.ts.map