"use strict";
/**
 * CODEGEN V3 WITH SIMPLE RETRY
 *
 * Simple retry wrapper - just retries on failure
 * NO complex validation, trust the LLM
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.codegenV3WithRetry = codegenV3WithRetry;
const codegenV3_1 = require("./codegenV3");
const logger_1 = require("../logger");
const MAX_RETRIES = 3; // Increased to 3 for better reliability with paid tier
const BASE_RETRY_DELAY = 2000; // Base delay: 2 seconds (optimized for paid tier)
/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attemptNumber) {
    return BASE_RETRY_DELAY * Math.pow(2, attemptNumber - 1); // 2s, 4s, 8s...
}
/**
 * Simple retry wrapper
 */
async function codegenV3WithRetry(step, topic, attemptNumber = 1) {
    logger_1.logger.info(`[codegenV3WithRetry] 🔄 Attempt ${attemptNumber}/${MAX_RETRIES} for step ${step.id}`);
    try {
        const result = await (0, codegenV3_1.codegenV3)(step, topic);
        // Accept any non-null result
        if (result) {
            logger_1.logger.info(`[codegenV3WithRetry] ✅ SUCCESS (${result.actions.length} actions)`);
            return result;
        }
        // Retry if failed with exponential backoff
        if (attemptNumber < MAX_RETRIES) {
            logger_1.logger.warn(`[codegenV3WithRetry] ⚠️ Null result, retrying...`);
            const delay = getRetryDelay(attemptNumber);
            logger_1.logger.info(`[codegenV3WithRetry] Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return codegenV3WithRetry(step, topic, attemptNumber + 1);
        }
        logger_1.logger.error(`[codegenV3WithRetry] ❌ All attempts failed`);
        return null;
    }
    catch (error) {
        logger_1.logger.error(`[codegenV3WithRetry] Exception:`, error);
        // Retry on exception with exponential backoff
        if (attemptNumber < MAX_RETRIES) {
            const delay = getRetryDelay(attemptNumber);
            logger_1.logger.info(`[codegenV3WithRetry] Waiting ${delay}ms before retry after exception...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return codegenV3WithRetry(step, topic, attemptNumber + 1);
        }
        return null;
    }
}
