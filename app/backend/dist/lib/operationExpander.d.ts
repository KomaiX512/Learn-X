/**
 * OPERATION EXPANDER - Intelligently add visuals to reach 50-70 operations
 *
 * Problem: Gemini generates 27-33 operations (below target)
 * Solution: Identify gaps and add complementary visuals
 * Result: Achieve 50-70 operations without overwhelming Gemini
 */
import { Action } from '../types';
/**
 * Main expansion function
 */
export declare function expandOperations(actions: Action[], targetRange?: {
    min: number;
    max: number;
}): Action[];
/**
 * Check if operations need expansion
 */
export declare function needsExpansion(actions: Action[]): boolean;
//# sourceMappingURL=operationExpander.d.ts.map