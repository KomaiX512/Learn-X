/**
 * CODEGEN V2 - Production-Grade Code Generation with Layout Engine
 * 
 * Uses visualAgentV2 for intelligent tool selection
 * Applies layout engine to prevent text overlap
 * NO fallbacks, TRUE dynamic generation
 */

import { Action, PlanStep } from '../types';
import { logger } from '../logger';
import visualAgentV2 from './visualAgentV2';
import { fixLabelOverlap } from '../lib/layoutEngine';

export interface CodegenChunk {
  type: 'actions';
  stepId: number;
  actions: Action[];
}

/**
 * Generate code/actions for a step using intelligent visual agent
 */
export async function codegenAgentV2(
  step: PlanStep,
  topic: string
): Promise<CodegenChunk | null> {
  logger.info(`[codegenV2] Starting generation for step ${step.id}: ${step.tag}`);
  
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`[codegenV2] Attempt ${attempt}/${maxRetries} for step ${step.id}`);
      
      // Use visual agent V2 with intelligent tool selection
      const visualResult = await visualAgentV2(step, topic);
      
      if (!visualResult || !visualResult.actions || visualResult.actions.length === 0) {
        throw new Error('No content generated');
      }
      
      logger.debug(`[codegenV2] Generated ${visualResult.actions.length} operations`);
      
      // Apply layout engine to fix label overlap
      logger.debug(`[codegenV2] Applying anti-overlap layout...`);
      const layoutedActions = fixLabelOverlap(visualResult.actions);
      
      logger.info(`[codegenV2] ✅ Successfully generated ${layoutedActions.length} operations for step ${step.id}`);
      
      return {
        type: 'actions',
        stepId: step.id,
        actions: layoutedActions
      };
      
    } catch (error) {
      lastError = error as Error;
      logger.warn(`[codegenV2] Attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        const delay = attempt * 1000;
        logger.info(`[codegenV2] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  logger.error(`[codegenV2] Failed after ${maxRetries} attempts:`, lastError);
  return null;
}

export default codegenAgentV2;
