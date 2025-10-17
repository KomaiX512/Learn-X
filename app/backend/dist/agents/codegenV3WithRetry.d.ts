/**
 * CODEGEN V3 WITH SIMPLE RETRY
 *
 * Simple retry wrapper - just retries on failure
 * NO complex validation, trust the LLM
 */
import { CodegenChunk } from './codegenV3';
import { PlanStep } from '../types';
/**
 * Simple retry wrapper
 */
export declare function codegenV3WithRetry(step: PlanStep, topic: string, attemptNumber?: number): Promise<CodegenChunk | null>;
//# sourceMappingURL=codegenV3WithRetry.d.ts.map