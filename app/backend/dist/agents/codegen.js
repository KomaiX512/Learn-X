"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codegenAgent = codegenAgent;
const logger_1 = require("../logger");
const visual_1 = require("./visual");
async function codegenAgent(step, topic) {
    logger_1.logger.debug(`[codegen] Starting generation for step ${step.id}`);
    // RETRY LOGIC with exponential backoff
    const maxRetries = 3;
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger_1.logger.debug(`[codegen] Attempt ${attempt}/${maxRetries} for step ${step.id}`);
            // Use ONLY visual agent which now generates complete educational content
            const visualResult = await (0, visual_1.visualAgent)(step, topic).catch(err => {
                logger_1.logger.warn(`[codegen] Visual agent attempt ${attempt} failed: ${err.message}`);
                lastError = err;
                return null;
            });
            // Check if we got content
            if (!visualResult || !visualResult.actions || visualResult.actions.length === 0) {
                if (attempt < maxRetries) {
                    logger_1.logger.warn(`[codegen] No content generated, retrying in ${attempt * 1000}ms...`);
                    await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                    continue;
                }
                throw lastError || new Error('Content generation failed after all retries');
            }
            // Extract ALL actions - NO STRIPPING, NO FILTERING
            const allActions = visualResult.actions || [];
            logger_1.logger.debug(`[codegen] Got ${allActions.length} total operations`);
            // Build final actions with proper structure
            const finalActions = [];
            // ALWAYS clear canvas completely between steps
            finalActions.push({ op: 'clear', target: 'all' });
            finalActions.push({ op: 'delay', duration: 0.5 });
            // Add ALL generated content - preserve educational completeness
            finalActions.push(...allActions);
            // Final pause before next step
            finalActions.push({ op: 'delay', duration: 1 });
            // NO VALIDATION - trust the visual agent's educational content
            // NO CAPS - allow full content to pass through
            // Return successful result with ALL content
            const finalChunk = {
                type: 'actions',
                stepId: step.id,
                actions: finalActions // NO SLICING, NO LIMITS
            };
            logger_1.logger.debug(`[codegen] SUCCESS: ${finalChunk.actions.length} total operations delivered`);
            return finalChunk;
        }
        catch (error) {
            logger_1.logger.error(`[codegen] Attempt ${attempt} failed: ${error}`);
            lastError = error;
            if (attempt < maxRetries) {
                const delay = attempt * 2000; // Exponential backoff
                logger_1.logger.info(`[codegen] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    // All retries failed
    logger_1.logger.error(`[codegen] Failed after ${maxRetries} attempts`);
    throw lastError || new Error('Code generation failed');
}
//# sourceMappingURL=codegen.js.map