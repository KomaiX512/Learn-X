/**
 * GENERIC TO V2 CONVERTER - Upgrade generic shapes to domain-specific tools
 *
 * Problem: Gemini uses 77% generic operations (drawCircle, drawRect)
 * Solution: Intelligently convert generic shapes to domain-specific V2 tools
 * Result: Achieve 60-70% V2 operations without complexity in prompt
 */
import { Action } from '../types';
/**
 * Main conversion function
 */
export declare function convertGenericToV2(actions: Action[], topic: string): Action[];
/**
 * Calculate V2 operation percentage
 */
export declare function calculateV2Percentage(actions: Action[]): number;
//# sourceMappingURL=genericToV2Converter.d.ts.map