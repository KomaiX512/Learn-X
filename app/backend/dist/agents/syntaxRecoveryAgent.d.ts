/**
 * SYNTAX RECOVERY AGENT
 *
 * Uses LLM to fix malformed JSON and syntax errors
 * Last resort before failure - ensures maximum success rate
 */
import { Action } from '../types';
export declare function recoverJSON(malformedText: string, expectedType: 'descriptions' | 'operations'): Promise<any>;
/**
 * Validates and fixes operation objects to ensure they're renderable
 */
export declare function validateOperations(operations: any[]): Action[];
//# sourceMappingURL=syntaxRecoveryAgent.d.ts.map