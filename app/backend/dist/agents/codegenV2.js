"use strict";
/**
 * CODEGEN V2 - Production-Grade Code Generation with Post-Processing Pipeline
 *
 * Pipeline:
 * 1. Visual Agent V2 - Generates 30-40 decent operations
 * 2. Grid Snapper - Snaps all positions to 0.05 grid (100% alignment)
 * 3. Operation Expander - Adds visuals to reach 50-70 operations
 * 4. Generic→V2 Converter - Upgrades shapes to domain tools (60-70% V2)
 * 5. Layout Engine - Prevents text overlap
 * 6. Composition Validator - Final quality check
 *
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
const gridSnapper_1 = require("../lib/gridSnapper");
const operationExpander_1 = require("../lib/operationExpander");
const genericToV2Converter_1 = require("../lib/genericToV2Converter");
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
            const initialCount = visualResult.actions.length;
            logger_1.logger.info(`[codegenV2] 📥 Generated ${initialCount} operations from Gemini`);
            // ===== POST-PROCESSING PIPELINE =====
            logger_1.logger.info(`[codegenV2] 🔧 Starting post-processing pipeline...`);
            // STEP 1: Grid Snapping (100% alignment guarantee)
            const gridBefore = Math.round((0, gridSnapper_1.checkGridAlignment)(visualResult.actions));
            const snapped = (0, gridSnapper_1.snapAllToGrid)(visualResult.actions);
            logger_1.logger.info(`[codegenV2] ✅ Grid snapping: ${gridBefore}% → 100% aligned`);
            // STEP 2: Operation Expansion (reach 50-70 target)
            let expanded = snapped;
            if ((0, operationExpander_1.needsExpansion)(snapped)) {
                expanded = (0, operationExpander_1.expandOperations)(snapped);
                logger_1.logger.info(`[codegenV2] ✅ Expansion: ${snapped.length} → ${expanded.length} operations`);
            }
            else {
                logger_1.logger.info(`[codegenV2] ⏭️  No expansion needed: ${snapped.length} operations`);
            }
            // STEP 3: Generic→V2 Conversion (boost domain-specific tools)
            const v2Before = (0, genericToV2Converter_1.calculateV2Percentage)(expanded);
            const converted = (0, genericToV2Converter_1.convertGenericToV2)(expanded, topic);
            const v2After = (0, genericToV2Converter_1.calculateV2Percentage)(converted);
            logger_1.logger.info(`[codegenV2] ✅ V2 conversion: ${v2Before}% → ${v2After}% domain-specific`);
            // STEP 4: Layout Engine (prevent text overlap)
            const layouted = (0, layoutEngine_1.fixLabelOverlap)(converted);
            logger_1.logger.info(`[codegenV2] ✅ Layout engine applied`);
            // STEP 5: Composition Validation (quality check)
            const compositionReport = compositionValidator_1.CompositionValidator.validate(layouted, topic);
            compositionValidator_1.CompositionValidator.logReport(compositionReport, step.id);
            // Final summary
            logger_1.logger.info(`[codegenV2] 📊 Pipeline complete:`);
            logger_1.logger.info(`[codegenV2]    Operations: ${initialCount} → ${layouted.length} (+${layouted.length - initialCount})`);
            logger_1.logger.info(`[codegenV2]    Grid: ${gridBefore}% → 100%`);
            logger_1.logger.info(`[codegenV2]    V2 Ops: ${v2Before}% → ${v2After}%`);
            logger_1.logger.info(`[codegenV2]    Composition: ${compositionReport.score}%`);
            logger_1.logger.info(`[codegenV2] ✅ Successfully generated ${layouted.length} operations for step ${step.id}`);
            return {
                type: 'actions',
                stepId: step.id,
                actions: layouted
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
//# sourceMappingURL=codegenV2.js.map