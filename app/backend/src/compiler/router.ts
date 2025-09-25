import { RenderChunk } from '../types';
import { logger } from '../logger';

export async function compilerRouter(codeOrChunk: any, type: string): Promise<RenderChunk> {
  logger.debug(`compilerRouter: routing to ${type}`);
  switch (type) {
    case 'js': {
      const chunk = codeOrChunk as RenderChunk;
      return chunk;
    }
    case 'latex': {
      const chunk = codeOrChunk as RenderChunk;
      return chunk;
    }
    case 'wasm-py': {
      const chunk = codeOrChunk as RenderChunk;
      return chunk;
    }
    default:
      throw new Error('Invalid compiler type');
  }
}
