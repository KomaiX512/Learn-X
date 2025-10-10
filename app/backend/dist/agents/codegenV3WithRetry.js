"use strict";
/**
 * CODEGEN V3 WITH RETRY STRATEGY
 *
 * Wraps codegenV3 with intelligent retry logic
 * - Up to 3 retry attempts with exponential backoff
 * - Uses syntax recovery agent as last resort
 * - NO fallbacks, but maximum effort to succeed
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.codegenV3WithRetry = codegenV3WithRetry;
exports.getRetryStats = getRetryStats;
const codegenV3_1 = require("./codegenV3");
const logger_1 = require("../logger");
const MAX_RETRIES = 5; // Increased for 503 errors
const BASE_DELAY = 5000; // 5 seconds (longer for API overload)
/**
 * Wrapper for codegenV3 with retry strategy
 * Returns null only if all attempts fail
 */
async function codegenV3WithRetry(step, topic, attemptNumber = 1) {
    logger_1.logger.info(`[codegenV3WithRetry] 🔄 Attempt ${attemptNumber}/${MAX_RETRIES} for step ${step.id}`);
    try {
        const result = await (0, codegenV3_1.codegenV3)(step, topic);
        if (result && result.actions && result.actions.length >= 15) {
            logger_1.logger.info(`[codegenV3WithRetry] ✅ SUCCESS on attempt ${attemptNumber}: ${result.actions.length} operations`);
            return result;
        }
        // Result is insufficient (null or too few operations)
        if (attemptNumber < MAX_RETRIES) {
            const delay = BASE_DELAY * Math.pow(2, attemptNumber - 1); // Exponential backoff
            logger_1.logger.warn(`[codegenV3WithRetry] ⚠️ Attempt ${attemptNumber} insufficient, retrying in ${delay}ms...`);
            logger_1.logger.warn(`[codegenV3WithRetry] Result was: ${result ? `${result.actions.length} ops` : 'null'}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return codegenV3WithRetry(step, topic, attemptNumber + 1);
        }
        // All retries exhausted
        logger_1.logger.error(`[codegenV3WithRetry] ❌ ALL ${MAX_RETRIES} ATTEMPTS FAILED for step ${step.id}`);
        logger_1.logger.error(`[codegenV3WithRetry] Topic: "${topic}"`);
        logger_1.logger.error(`[codegenV3WithRetry] Step desc: "${step.desc}"`);
        return null;
    }
    catch (error) {
        logger_1.logger.error(`[codegenV3WithRetry] ❌ Exception on attempt ${attemptNumber}:`, error);
        // Retry on exception (unless last attempt)
        if (attemptNumber < MAX_RETRIES) {
            const delay = BASE_DELAY * Math.pow(2, attemptNumber - 1);
            logger_1.logger.warn(`[codegenV3WithRetry] Retrying after exception in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return codegenV3WithRetry(step, topic, attemptNumber + 1);
        }
        // Last attempt failed
        logger_1.logger.error(`[codegenV3WithRetry] ❌ FATAL: All ${MAX_RETRIES} attempts failed with exceptions`);
        return null;
    }
}
/**
 * Get retry statistics for monitoring
 */
function getRetryStats() {
    return {
        maxRetries: MAX_RETRIES,
        baseDelay: BASE_DELAY,
        description: 'Exponential backoff retry strategy for codegenV3'
    };
}
