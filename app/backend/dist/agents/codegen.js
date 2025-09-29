"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codegenAgent = codegenAgent;
const logger_1 = require("../logger");
const visual_1 = require("./visual");
const text_1 = require("./text");
// DUAL PIPELINE ARCHITECTURE - Separate visual and text generation
async function codegenAgent(step, params = {}, query, onChunk) {
    logger_1.logger.debug(`[codegen] DUAL PIPELINE START: stepId=${step.id} tag=${step.tag}`, { params, query });
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error('GEMINI_API_KEY is not set - NO FALLBACKS ALLOWED');
    }
    // PARALLEL GENERATION - Visual and Text agents run simultaneously
    const topic = query || step.desc;
    logger_1.logger.debug(`[codegen] Starting PARALLEL generation for step ${step.id}`);
    // Run both agents in parallel
    const [visualResult, textResult] = await Promise.allSettled([
        (0, visual_1.visualAgent)(step, topic),
        (0, text_1.textAgent)(step, topic)
    ]);
    // Extract results
    let visualActions = [];
    let textActions = [];
    if (visualResult.status === 'fulfilled') {
        visualActions = visualResult.value.actions;
        logger_1.logger.debug(`[codegen] Visual agent SUCCESS: ${visualActions.length} actions`);
    }
    else {
        logger_1.logger.error(`[codegen] Visual agent FAILED: ${visualResult.reason}`);
        // NO FALLBACKS - FAIL PROPERLY
        throw new Error(`Visual generation failed: ${visualResult.reason}`);
    }
    if (textResult.status === 'fulfilled') {
        textActions = textResult.value.actions;
        logger_1.logger.debug(`[codegen] Text agent SUCCESS: ${textActions.length} actions`);
    }
    else {
        logger_1.logger.error(`[codegen] Text agent FAILED: ${textResult.reason}`);
        // NO FALLBACKS - FAIL PROPERLY  
        throw new Error(`Text generation failed: ${textResult.reason}`);
    }
    // INTELLIGENT MERGING - Interleave visual and text for cinematic flow
    const mergedActions = [];
    // ALWAYS clear canvas completely between steps
    mergedActions.push({ op: 'clear', target: 'all' });
    mergedActions.push({ op: 'delay', duration: 0.5 }); // Short pause for clean transition
    // Add title first if exists
    const titleAction = textActions.find(a => a.op === 'drawTitle' || (a.op === 'drawLabel' && a.isTitle));
    if (titleAction) {
        mergedActions.push(titleAction);
        mergedActions.push({ op: 'delay', duration: 1 }); // pause after title for reading
    }
    // Interleave visuals with occasional text - SLOWER PACING
    let visualIndex = 0;
    let textIndex = 0;
    // Skip title if already added
    if (titleAction) {
        textIndex = textActions.indexOf(titleAction) + 1;
    }
    // Interleave visuals and text for better flow - LESS DELAYS
    while (visualIndex < visualActions.length || textIndex < textActions.length) {
        // Add 5-6 visuals in a burst
        for (let i = 0; i < 6 && visualIndex < visualActions.length; i++) {
            mergedActions.push(visualActions[visualIndex++]);
            // Only add delay every 3rd visual
            if (i % 3 === 2) {
                mergedActions.push({ op: 'delay', duration: 0.3 });
            }
        }
        // Add one text label if available
        if (textIndex < textActions.length) {
            mergedActions.push(textActions[textIndex++]);
            mergedActions.push({ op: 'delay', duration: 0.5 }); // Shorter read time
        }
    }
    // Final pause before next step
    mergedActions.push({ op: 'delay', duration: 1 });
    // CAP TOTAL ACTIONS AT 45 to allow more visuals
    const cappedActions = mergedActions.slice(0, 45);
    // Create final chunk
    const finalChunk = {
        type: 'actions',
        stepId: step.id,
        actions: cappedActions
    };
    logger_1.logger.debug(`[codegen] DUAL PIPELINE COMPLETE: ${cappedActions.length} total actions (capped from ${mergedActions.length})`);
    return finalChunk;
}
