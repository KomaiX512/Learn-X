/**
 * STRICT VISUAL VALIDATION SYSTEM
 * Enforces 3Blue1Brown-style visual-first content
 * NO FALLBACKS - Rejects bad content and retries
 */
export interface ValidationResult {
    valid: boolean;
    visualCount: number;
    textCount: number;
    visualRatio: number;
    errors: string[];
    needsRetry: boolean;
}
export declare function validateChunk(actions: any[]): ValidationResult;
export declare function validateStepActions(actions: any[]): ValidationResult;
//# sourceMappingURL=validator.d.ts.map