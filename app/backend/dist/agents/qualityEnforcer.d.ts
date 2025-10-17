/**
 * QUALITY ENFORCEMENT SYSTEM
 *
 * Validates generated content meets 3Blue1Brown standards
 * REJECTS poor quality and forces retry (not hardcoded fallback)
 *
 * Philosophy: If Gemini produces garbage, REJECT it and regenerate
 * NOT inject hardcoded content
 */
import { Action, PlanStep } from '../types';
export interface QualityReport {
    passed: boolean;
    score: number;
    issues: string[];
    recommendations: string[];
}
export declare class QualityEnforcer {
    /**
     * Validate generated actions meet minimum quality standards
     * REJECTS if quality too poor, forcing regeneration
     */
    static validateActions(actions: Action[], step: PlanStep, topic: string): QualityReport;
    /**
     * Generate enhanced retry prompt based on quality issues
     * Tells Gemini EXACTLY what was wrong and how to fix it
     */
    static generateRetryPrompt(originalPrompt: string, report: QualityReport, topic: string, step: PlanStep): string;
    /**
     * Log quality report for monitoring
     */
    static logReport(report: QualityReport, step: PlanStep, topic: string): void;
}
//# sourceMappingURL=qualityEnforcer.d.ts.map