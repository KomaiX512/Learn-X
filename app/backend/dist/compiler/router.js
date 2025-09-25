"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compilerRouter = compilerRouter;
const logger_1 = require("../logger");
async function compilerRouter(codeOrChunk, type) {
    logger_1.logger.debug(`compilerRouter: routing to ${type}`);
    switch (type) {
        case 'js': {
            const chunk = codeOrChunk;
            return chunk;
        }
        case 'latex': {
            const chunk = codeOrChunk;
            return chunk;
        }
        case 'wasm-py': {
            const chunk = codeOrChunk;
            return chunk;
        }
        default:
            throw new Error('Invalid compiler type');
    }
}
