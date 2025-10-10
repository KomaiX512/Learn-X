"use strict";
/**
 * CODEGEN V4 - TRUE DYNAMIC GENERATION WITH SUB-PLANNING
 *
 * Architecture:
 * 1. SubPlanner creates 4-6 DETAILED visual concepts
 * 2. Each concept generates 8-15 operations INDEPENDENTLY
 * 3. Combine all operations (total: 40-90 per step)
 *
 * NO GENERIC SHAPES - Everything contextually specific!
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.codegenV4 = codegenV4;
exports.codegenV4WithRetry = codegenV4WithRetry;
const logger_1 = require("../logger");
const subPlanner_1 = require("./subPlanner");
const focusedVisualGenerator_1 = require("./focusedVisualGenerator");
async function codegenV4(step, topic, apiKey) {
    const startTime = Date.now();
    logger_1.logger.info(`[codegenV4] 🚀 Starting V4 generation for step ${step.id}: ${step.tag}`);
    logger_1.logger.info(`[codegenV4] Topic: "${topic}"`);
    logger_1.logger.info(`[codegenV4] Description: ${step.desc}`);
    try {
        // STEP 1: Create detailed visual plan
        logger_1.logger.info(`[codegenV4] STEP 1: Creating visual plan...`);
        const visualConcepts = await (0, subPlanner_1.createVisualPlan)(step, topic, apiKey);
        if (visualConcepts.length === 0) {
            throw new Error('No visual concepts generated');
        }
        logger_1.logger.info(`[codegenV4] ✅ Visual plan created: ${visualConcepts.length} concepts`);
        // STEP 2: Generate operations for each concept
        logger_1.logger.info(`[codegenV4] STEP 2: Generating visuals for ${visualConcepts.length} concepts...`);
        const operations = await (0, focusedVisualGenerator_1.generateAllVisuals)(visualConcepts, topic, apiKey);
        if (operations.length === 0) {
            throw new Error('No operations generated');
        }
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        logger_1.logger.info(`[codegenV4] === COMPLETE in ${duration}s ===`);
        logger_1.logger.info(`[codegenV4] ✅ Total operations: ${operations.length}`);
        logger_1.logger.info(`[codegenV4] ✅ Concepts: ${visualConcepts.length}`);
        logger_1.logger.info(`[codegenV4] ✅ Average ops/concept: ${(operations.length / visualConcepts.length).toFixed(1)}`);
        // Quality check
        const quality = operations.length >= 50 ? '🏆 HIGH QUALITY' :
            operations.length >= 40 ? '✅ GOOD QUALITY' :
                operations.length >= 30 ? '⚠️  ACCEPTABLE' : '❌ LOW QUALITY';
        logger_1.logger.info(`[codegenV4] ${quality}`);
        return {
            type: 'actions',
            stepId: step.id,
            actions: operations
        };
    }
    catch (error) {
        logger_1.logger.error(`[codegenV4] ❌ Generation failed:`, error);
        throw error;
    }
}
/**
 * V4 with retry logic
 */
async function codegenV4WithRetry(step, topic, apiKey, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger_1.logger.info(`[codegenV4WithRetry] 🔄 Attempt ${attempt}/${maxRetries} for step ${step.id}`);
            const result = await codegenV4(step, topic, apiKey);
            // Check if we got enough operations
            if (result.actions.length >= 25) { // Minimum acceptable
                logger_1.logger.info(`[codegenV4WithRetry] ✅ SUCCESS on attempt ${attempt}: ${result.actions.length} operations`);
                return result;
            }
            else {
                logger_1.logger.warn(`[codegenV4WithRetry] ⚠️  Only ${result.actions.length} operations, retrying...`);
                if (attempt === maxRetries) {
                    // Last attempt - return what we have
                    return result;
                }
            }
        }
        catch (error) {
            logger_1.logger.error(`[codegenV4WithRetry] ❌ Attempt ${attempt} failed:`, error);
            if (attempt === maxRetries) {
                throw error;
            }
            // Wait before retry (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            logger_1.logger.info(`[codegenV4WithRetry] Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('All retry attempts failed');
}
