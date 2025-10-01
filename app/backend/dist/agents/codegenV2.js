"use strict";
/**
 * CODEGEN V2 - Production-Grade Code Generation with Layout Engine
 *
 * Uses visualAgentV2 for intelligent tool selection
 * Applies layout engine to prevent text overlap
 * NO fallbacks, TRUE dynamic generation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.codegenAgentV2 = codegenAgentV2;
const logger_1 = require("../logger");
const visualAgentV2_1 = __importDefault(require("./visualAgentV2"));
const layoutEngine_1 = require("../lib/layoutEngine");
const compositionValidator_1 = require("../lib/compositionValidator");
/**
 * Generate code/actions for a step using intelligent visual agent
 */
async function codegenAgentV2(step, topic) {
    logger_1.logger.info(`[codegenV2] Starting generation for step ${step.id}: ${step.tag}`);
    const maxRetries = 3;
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger_1.logger.debug(`[codegenV2] Attempt ${attempt}/${maxRetries} for step ${step.id}`);
            // Use visual agent V2 with intelligent tool selection
            const visualResult = await (0, visualAgentV2_1.default)(step, topic);
            if (!visualResult || !visualResult.actions || visualResult.actions.length === 0) {
                throw new Error('No content generated');
            }
            logger_1.logger.debug(`[codegenV2] Generated ${visualResult.actions.length} operations`);
            // Apply layout engine to fix label overlap
            logger_1.logger.debug(`[codegenV2] Applying anti-overlap layout...`);
            const layoutedActions = (0, layoutEngine_1.fixLabelOverlap)(visualResult.actions);
            // Validate composition quality (optional - doesn't block delivery)
            const compositionReport = compositionValidator_1.CompositionValidator.validate(layoutedActions, topic);
            compositionValidator_1.CompositionValidator.logReport(compositionReport, step.id);
            if (!compositionReport.passed) {
                logger_1.logger.warn(`[codegenV2] ⚠️ Composition quality below professional standards (${compositionReport.score}%)`);
                // Note: We don't reject here, just log for monitoring
                // The quality enforcer already handled rejection of truly bad content
            }
            logger_1.logger.info(`[codegenV2] ✅ Successfully generated ${layoutedActions.length} operations for step ${step.id}`);
            return {
                type: 'actions',
                stepId: step.id,
                actions: layoutedActions
            };
        }
        catch (error) {
            lastError = error;
            logger_1.logger.warn(`[codegenV2] Attempt ${attempt} failed:`, error);
            if (attempt < maxRetries) {
                const delay = attempt * 1000;
                logger_1.logger.info(`[codegenV2] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    logger_1.logger.error(`[codegenV2] Failed after ${maxRetries} attempts:`, lastError);
    return null;
}
exports.default = codegenAgentV2;
