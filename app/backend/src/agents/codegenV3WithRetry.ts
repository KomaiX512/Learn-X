/**
 * CODEGEN V3 WITH RETRY STRATEGY
 * 
 * Wraps codegenV3 with intelligent retry logic
 * - Up to 3 retry attempts with exponential backoff
 * - Uses syntax recovery agent as last resort
 * - NO fallbacks, but maximum effort to succeed
 */

import { codegenV3, CodegenChunk } from './codegenV3';
import { PlanStep } from '../types';
import { logger } from '../logger';

const MAX_RETRIES = 5;  // Increased for 503 errors
const BASE_DELAY = 5000; // 5 seconds (longer for API overload)

/**
 * Wrapper for codegenV3 with retry strategy
 * Returns null only if all attempts fail
 */
export async function codegenV3WithRetry(
  step: PlanStep, 
  topic: string,
  attemptNumber: number = 1
): Promise<CodegenChunk | null> {
  
  logger.info(`[codegenV3WithRetry] 🔄 Attempt ${attemptNumber}/${MAX_RETRIES} for step ${step.id}`);
  
  try {
    const result = await codegenV3(step, topic);
    
    if (result && result.actions && result.actions.length >= 15) {
      logger.info(`[codegenV3WithRetry] ✅ SUCCESS on attempt ${attemptNumber}: ${result.actions.length} operations`);
      return result;
    }
    
    // Result is insufficient (null or too few operations)
    if (attemptNumber < MAX_RETRIES) {
      const delay = BASE_DELAY * Math.pow(2, attemptNumber - 1); // Exponential backoff
      logger.warn(`[codegenV3WithRetry] ⚠️ Attempt ${attemptNumber} insufficient, retrying in ${delay}ms...`);
      logger.warn(`[codegenV3WithRetry] Result was: ${result ? `${result.actions.length} ops` : 'null'}`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return codegenV3WithRetry(step, topic, attemptNumber + 1);
    }
    
    // All retries exhausted
    logger.error(`[codegenV3WithRetry] ❌ ALL ${MAX_RETRIES} ATTEMPTS FAILED for step ${step.id}`);
    logger.error(`[codegenV3WithRetry] Topic: "${topic}"`);
    logger.error(`[codegenV3WithRetry] Step desc: "${step.desc}"`);
    return null;
    
  } catch (error) {
    logger.error(`[codegenV3WithRetry] ❌ Exception on attempt ${attemptNumber}:`, error);
    
    // Retry on exception (unless last attempt)
    if (attemptNumber < MAX_RETRIES) {
      const delay = BASE_DELAY * Math.pow(2, attemptNumber - 1);
      logger.warn(`[codegenV3WithRetry] Retrying after exception in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return codegenV3WithRetry(step, topic, attemptNumber + 1);
    }
    
    // Last attempt failed
    logger.error(`[codegenV3WithRetry] ❌ FATAL: All ${MAX_RETRIES} attempts failed with exceptions`);
    return null;
  }
}

/**
 * Get retry statistics for monitoring
 */
export function getRetryStats() {
  return {
    maxRetries: MAX_RETRIES,
    baseDelay: BASE_DELAY,
    description: 'Exponential backoff retry strategy for codegenV3'
  };
}
