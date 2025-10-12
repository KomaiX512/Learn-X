/**
 * CODEGEN V3 WITH SIMPLE RETRY
 * 
 * Simple retry wrapper - just retries on failure
 * NO complex validation, trust the LLM
 */

import { codegenV3, CodegenChunk } from './codegenV3';
import { PlanStep } from '../types';
import { logger } from '../logger';

const MAX_RETRIES = 3;  // Increased to 3 for better reliability with paid tier
const BASE_RETRY_DELAY = 2000; // Base delay: 2 seconds (optimized for paid tier)

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attemptNumber: number): number {
  return BASE_RETRY_DELAY * Math.pow(2, attemptNumber - 1); // 2s, 4s, 8s...
}

/**
 * Simple retry wrapper
 */
export async function codegenV3WithRetry(
  step: PlanStep, 
  topic: string,
  attemptNumber: number = 1
): Promise<CodegenChunk | null> {
  
  logger.info(`[codegenV3WithRetry] 🔄 Attempt ${attemptNumber}/${MAX_RETRIES} for step ${step.id}`);
  
  try {
    const result = await codegenV3(step, topic);
    
    // Accept any non-null result
    if (result) {
      logger.info(`[codegenV3WithRetry] ✅ SUCCESS (${result.actions.length} actions)`);
      return result;
    }
    
    // Retry if failed with exponential backoff
    if (attemptNumber < MAX_RETRIES) {
      logger.warn(`[codegenV3WithRetry] ⚠️ Null result, retrying...`);
      const delay = getRetryDelay(attemptNumber);
      logger.info(`[codegenV3WithRetry] Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return codegenV3WithRetry(step, topic, attemptNumber + 1);
    }
    
    logger.error(`[codegenV3WithRetry] ❌ All attempts failed`);
    return null;
    
  } catch (error) {
    logger.error(`[codegenV3WithRetry] Exception:`, error);
    
    // Retry on exception with exponential backoff
    if (attemptNumber < MAX_RETRIES) {
      const delay = getRetryDelay(attemptNumber);
      logger.info(`[codegenV3WithRetry] Waiting ${delay}ms before retry after exception...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return codegenV3WithRetry(step, topic, attemptNumber + 1);
    }
    
    return null;
  }
}
