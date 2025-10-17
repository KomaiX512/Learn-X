/**
 * COMPOSITION VALIDATOR
 *
 * Validates professional diagram composition standards:
 * - Grid alignment (positions on 0.05 multiples)
 * - Sectioning (multiple distinct concepts)
 * - Spacing (no overlap, proper margins)
 *
 * This is NOT a fallback generator - it only validates and provides feedback
 */
import { Action } from '../types';
export interface CompositionReport {
    passed: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
    metrics: {
        gridAlignmentScore: number;
        sectioningScore: number;
        spacingScore: number;
        densityScore: number;
    };
}
export declare class CompositionValidator {
    /**
     * Validate composition quality
     */
    static validate(actions: Action[], topic: string): CompositionReport;
    /**
     * Check if positions use grid alignment (0.05 multiples)
     */
    private static checkGridAlignment;
    /**
     * Check if content is divided into distinct sections/concepts
     */
    private static checkSectioning;
    /**
     * Check spacing and overlap prevention
     */
    private static checkSpacing;
    /**
     * Check content density balance
     */
    private static checkDensity;
    /**
     * Log composition report
     */
    static logReport(report: CompositionReport, stepId: number): void;
}
//# sourceMappingURL=compositionValidator.d.ts.map