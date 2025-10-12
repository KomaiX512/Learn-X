"use strict";
/**
 * CODEGEN V4 - PRODUCTION MULTI-VISUAL LECTURE PIPELINE
 *
 * Architecture:
 * Step → SubPlanner (1 call) → 4 Visual Scripts
 *      → PureVisualGenerator (4 parallel calls) → 4 SVGs
 *      → TranscriptGenerator (1 call) → Narration
 *
 * Total: 6 LLM calls per step (1 + 4 + 1)
 * Result: 4 high-quality animated SVGs + synchronized transcript
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.codegenV4 = codegenV4;
const logger_1 = require("../logger");
const subPlanner_1 = require("./subPlanner");
const pureVisualGenerator_1 = require("./pureVisualGenerator");
const transcriptGenerator_1 = require("./transcriptGenerator");
/**
 * V4 PRODUCTION PIPELINE
 * Generates 4 visuals + transcript for maximum educational impact
 */
async function codegenV4(step, topic) {
    const overallStart = Date.now();
    logger_1.logger.info(`[codegenV4] 🚀 Starting production pipeline for step ${step.id}`);
    logger_1.logger.info(`[codegenV4] Topic: "${topic}"`);
    logger_1.logger.info(`[codegenV4] Step: ${step.desc.substring(0, 100)}...`);
    try {
        // STAGE 1: Plan 4 visual scripts
        logger_1.logger.info(`[codegenV4] 📋 STAGE 1: Planning 4 visual scripts...`);
        const subPlan = await (0, subPlanner_1.subPlannerAgent)(step, topic);
        if (!subPlan || !subPlan.visualScripts || subPlan.visualScripts.length === 0) {
            logger_1.logger.error('[codegenV4] Sub-planning failed - no visual scripts generated');
            return null;
        }
        logger_1.logger.info(`[codegenV4] ✅ Got ${subPlan.visualScripts.length} visual scripts`);
        subPlan.visualScripts.forEach((script, idx) => {
            logger_1.logger.debug(`[codegenV4]   ${idx + 1}. ${script.title} (${script.type})`);
        });
        // STAGE 2: Generate 4 SVGs in parallel (4 independent LLM calls)
        logger_1.logger.info(`[codegenV4] 🎨 STAGE 2: Generating 4 SVGs in parallel...`);
        const visualGenerationStart = Date.now();
        const visualPromises = subPlan.visualScripts.map((script, index) => (0, pureVisualGenerator_1.pureVisualGenerator)(script, topic, step.id, index));
        const generatedVisuals = await Promise.all(visualPromises);
        // Filter out failed generations
        const successfulVisuals = generatedVisuals.filter((v) => v !== null);
        if (successfulVisuals.length === 0) {
            logger_1.logger.error('[codegenV4] All visual generations failed');
            return null;
        }
        const visualGenTime = ((Date.now() - visualGenerationStart) / 1000).toFixed(2);
        logger_1.logger.info(`[codegenV4] ✅ Generated ${successfulVisuals.length}/4 visuals in ${visualGenTime}s`);
        // Log stats
        const totalAnimations = successfulVisuals.reduce((sum, v) => sum + v.stats.animations, 0);
        const totalLabels = successfulVisuals.reduce((sum, v) => sum + v.stats.labels, 0);
        const totalShapes = successfulVisuals.reduce((sum, v) => sum + v.stats.shapes, 0);
        logger_1.logger.info(`[codegenV4] 📊 VISUALS: ${totalAnimations} animations, ${totalLabels} labels, ${totalShapes} shapes`);
        // STAGE 3: Generate transcript (1 LLM call with all 4 descriptions)
        logger_1.logger.info(`[codegenV4] 🎤 STAGE 3: Generating educational transcript...`);
        const transcriptResult = await (0, transcriptGenerator_1.transcriptGenerator)(step, topic, subPlan.visualScripts);
        const transcript = transcriptResult?.transcript || step.desc;
        logger_1.logger.info(`[codegenV4] ✅ Generated transcript (${transcriptResult?.wordCount || 0} words)`);
        // STAGE 4: Package as actions for frontend
        const actions = successfulVisuals.map((visual, index) => ({
            op: 'customSVG',
            svgCode: visual.svgCode,
            visualGroup: `step-${step.id}-visual-${index + 1}`,
            metadata: {
                title: visual.title,
                type: visual.type,
                visualIndex: index + 1,
                hasAnimations: visual.hasAnimations
            }
        }));
        const overallTime = ((Date.now() - overallStart) / 1000).toFixed(2);
        logger_1.logger.info(`[codegenV4] ✅ COMPLETE in ${overallTime}s`);
        logger_1.logger.info(`[codegenV4] 📦 Delivering: ${actions.length} visuals + transcript`);
        return {
            type: 'actions',
            stepId: step.id,
            actions,
            transcript,
            visualMetadata: {
                visualCount: successfulVisuals.length,
                totalAnimations,
                totalLabels,
                generationTime: parseFloat(overallTime)
            }
        };
    }
    catch (error) {
        logger_1.logger.error(`[codegenV4] Pipeline failed: ${error.message}`);
        logger_1.logger.error(`[codegenV4] Stack:`, error.stack);
        return null;
    }
}
exports.default = codegenV4;
