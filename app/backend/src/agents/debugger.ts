import { RenderChunk } from '../types';
import { logger } from '../logger';

export async function debugAgent(chunk: RenderChunk): Promise<RenderChunk> {
  logger.debug(`[debugger] START: Received chunk for stepId=${chunk.stepId}`);
  // If invalid or missing actions, provide a small, visible fallback so the UI always draws something.
  if (!chunk || chunk.type !== 'actions' || !Array.isArray(chunk.actions) || chunk.actions.length === 0) {
    logger.debug(`[debugger] Fallback: Fixing invalid/empty actions to ensure visible render.`);
    return {
      type: 'actions',
      stepId: chunk?.stepId,
      actions: [
        { op: 'drawAxis', normalized: true, xLabel: 'x', yLabel: 'y' },
        { op: 'drawLabel', normalized: true, text: 'Rendering fallback (no actions provided).', x: 0.08, y: 0.08, color: '#888' }
      ]
    };
  }
  logger.debug(`[debugger] END: Chunk is valid, returning as is.`);
  return chunk;
}
