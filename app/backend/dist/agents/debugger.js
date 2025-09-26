"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugAgent = debugAgent;
const logger_1 = require("../logger");
async function debugAgent(chunk) {
    logger_1.logger.debug(`[debugger] START: Received chunk for stepId=${chunk.stepId}`);
    if (!chunk || chunk.type !== 'actions' || !Array.isArray(chunk.actions)) {
        logger_1.logger.error(`[debugger] Invalid chunk received for stepId=${chunk?.stepId}`);
        throw new Error('Invalid chunk received by debugger');
    }
    logger_1.logger.debug(`[debugger] Chunk is valid with ${chunk.actions.length} actions, allowing all for rich visualizations`);
    return chunk;
}
