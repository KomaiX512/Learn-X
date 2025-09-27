import { RenderChunk } from '../types';
import { logger } from '../logger';

export async function debugAgent(chunk: RenderChunk): Promise<RenderChunk> {
  logger.debug(`[debugger] START: Received chunk for stepId=${chunk?.stepId}`);
  
  // Log what we actually received for debugging
  logger.debug(`[debugger] Chunk type: ${chunk?.type}`);
  logger.debug(`[debugger] Has actions: ${Array.isArray(chunk?.actions)}`);
  logger.debug(`[debugger] Actions count: ${chunk?.actions?.length || 0}`);
  
  if (!chunk || chunk.type !== 'actions' || !Array.isArray(chunk.actions)) {
    logger.error(`[debugger] Invalid chunk - type=${chunk?.type}, hasActions=${Array.isArray(chunk?.actions)}`);
    throw new Error('Invalid chunk received by debugger');
  }
  logger.debug(`[debugger] Chunk is valid with ${chunk.actions.length} actions, allowing all for rich visualizations`);
  return chunk;
}
