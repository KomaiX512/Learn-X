"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugAgent = debugAgent;
async function debugAgent(chunk) {
    if (!chunk || chunk.type !== 'actions' || !Array.isArray(chunk.actions)) {
        return { type: 'actions', actions: [] };
    }
    return chunk;
}
