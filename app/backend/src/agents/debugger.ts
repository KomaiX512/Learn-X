import { RenderChunk } from '../types';
import { logger } from '../logger';

export async function debugAgent(chunk: RenderChunk): Promise<RenderChunk> {
  logger.debug(`[debugger] START: Received chunk for stepId=${chunk.stepId}`);
  if (!chunk || chunk.type !== 'actions' || !Array.isArray(chunk.actions)) {
    logger.error(`[debugger] Invalid chunk received for stepId=${chunk?.stepId}`);
    throw new Error('Invalid chunk received by debugger');
  }
  logger.debug(`[debugger] Chunk is valid with ${chunk.actions.length} actions, allowing all for rich visualizations`);
  return chunk;
}
