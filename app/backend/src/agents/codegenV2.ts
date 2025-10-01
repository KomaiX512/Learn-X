/**
 * CODEGEN V2 - Production-Grade Code Generation with Post-Processing Pipeline
 * 
 * Pipeline:
 * 1. Visual Agent V2 - Generates 30-40 decent operations
 * 2. Grid Snapper - Snaps all positions to 0.05 grid (100% alignment)
 * 3. Operation Expander - Adds visuals to reach 50-70 operations
 * 4. Generic→V2 Converter - Upgrades shapes to domain tools (60-70% V2)
 * 5. Layout Engine - Prevents text overlap
 * 6. Composition Validator - Final quality check
 * 
 * NO fallbacks, TRUE dynamic generation
 */

import { Action, PlanStep } from '../types';
import { logger } from '../logger';
import visualAgentV2 from './visualAgentV2';
import { fixLabelOverlap } from '../lib/layoutEngine';
import { CompositionValidator } from '../lib/compositionValidator';
import { snapAllToGrid, checkGridAlignment } from '../lib/gridSnapper';
import { expandOperations, needsExpansion } from '../lib/operationExpander';
import { convertGenericToV2, calculateV2Percentage } from '../lib/genericToV2Converter';

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
      
      const initialCount = visualResult.actions.length;
      logger.info(`[codegenV2] 📥 Generated ${initialCount} operations from Gemini`);
      
      // ===== POST-PROCESSING PIPELINE =====
      logger.info(`[codegenV2] 🔧 Starting post-processing pipeline...`);
      
      // STEP 1: Grid Snapping (100% alignment guarantee)
      const gridBefore = Math.round(checkGridAlignment(visualResult.actions));
      const snapped = snapAllToGrid(visualResult.actions);
      logger.info(`[codegenV2] ✅ Grid snapping: ${gridBefore}% → 100% aligned`);
      
      // STEP 2: Operation Expansion (reach 50-70 target)
      let expanded = snapped;
      if (needsExpansion(snapped)) {
        expanded = expandOperations(snapped);
        logger.info(`[codegenV2] ✅ Expansion: ${snapped.length} → ${expanded.length} operations`);
      } else {
        logger.info(`[codegenV2] ⏭️  No expansion needed: ${snapped.length} operations`);
      }
      
      // STEP 3: Generic→V2 Conversion (boost domain-specific tools)
      const v2Before = calculateV2Percentage(expanded);
      const converted = convertGenericToV2(expanded, topic);
      const v2After = calculateV2Percentage(converted);
      logger.info(`[codegenV2] ✅ V2 conversion: ${v2Before}% → ${v2After}% domain-specific`);
      
      // STEP 4: Layout Engine (prevent text overlap)
      const layouted = fixLabelOverlap(converted);
      logger.info(`[codegenV2] ✅ Layout engine applied`);
      
      // STEP 5: Composition Validation (quality check)
      const compositionReport = CompositionValidator.validate(layouted, topic);
      CompositionValidator.logReport(compositionReport, step.id);
      
      // Final summary
      logger.info(`[codegenV2] 📊 Pipeline complete:`);
      logger.info(`[codegenV2]    Operations: ${initialCount} → ${layouted.length} (+${layouted.length - initialCount})`);
      logger.info(`[codegenV2]    Grid: ${gridBefore}% → 100%`);
      logger.info(`[codegenV2]    V2 Ops: ${v2Before}% → ${v2After}%`);
      logger.info(`[codegenV2]    Composition: ${compositionReport.score}%`);
      logger.info(`[codegenV2] ✅ Successfully generated ${layouted.length} operations for step ${step.id}`);
      
      return {
        type: 'actions',
        stepId: step.id,
        actions: layouted
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
