/**
 * STRICT VISUAL VALIDATION SYSTEM
 * Enforces 3Blue1Brown-style visual-first content
 * NO FALLBACKS - Rejects bad content and retries
 */

import { logger } from '../logger';

export interface ValidationResult {
  valid: boolean;
  visualCount: number;
  textCount: number;
  visualRatio: number;
  errors: string[];
  needsRetry: boolean;
}

const VISUAL_OPS = [
  // V1 Operations (legacy)
  'drawCircle', 'drawRect', 'drawVector', 'drawCurve', 'drawAxis',
  'orbit', 'wave', 'particle', 'arrow', 'field', 'flow',
  'pulse', 'rotate', 'transform', 'trace', 'spotlight',
  'fadeIn', 'fadeOut', 'pendulum', 'spring', 'morph',
  'drawParticles', 'drawSpiral', 'drawRipple', 'drawDiagram',
  'drawGraph', 'drawMolecule', 'drawFlowchart',
  
  // V2 Operations (domain-specific)
  // Electrical & Electronics
  'drawCircuitElement', 'drawSignalWaveform', 'drawConnection',
  
  // Physics & Mechanics
  'drawForceVector', 'drawPhysicsObject', 'drawTrajectory', 'drawFieldLines',
  
  // Biology & Anatomy
  'drawCellStructure', 'drawOrganSystem', 'drawMolecularStructure', 'drawMembrane',
  
  // Chemistry
  'drawAtom', 'drawBond', 'drawReaction',
  
  // Mathematics
  'drawGeometry', 'drawCoordinateSystem',
  
  // Computer Science
  'drawDataStructure', 'drawNeuralNetwork', 'drawAlgorithmStep',
  
  // General
  'drawAnnotation', 'animate', 'createSimulation'
];

const TEXT_OPS = ['drawLabel', 'drawTitle', 'drawMathLabel'];

const BANNED_WORDS = [
  'imagine', 'think about', 'consider', 'picture this',
  'visualize', 'envision', 'suppose', 'pretend'
];

export function validateChunk(actions: any[]): ValidationResult {
  let visualCount = 0;
  let textCount = 0;
  const errors: string[] = [];
  
  // Count operations
  actions.forEach(action => {
    if (VISUAL_OPS.includes(action.op)) {
      visualCount++;
    } else if (TEXT_OPS.includes(action.op)) {
      textCount++;
      
      // Check for banned words
      if (action.text && typeof action.text === 'string') {
        const lowerText = action.text.toLowerCase();
        BANNED_WORDS.forEach(banned => {
          if (lowerText.includes(banned)) {
            errors.push(`Contains banned word: "${banned}"`);
          }
        });
      }
    }
  });
  
  const totalOps = visualCount + textCount;
  const visualRatio = totalOps > 0 ? visualCount / totalOps : 0;
  
  // REASONABLE VALIDATION RULES - Not too strict
  if (visualCount < 2) {
    errors.push(`Not enough visual operations: ${visualCount} (need >= 2)`);
  }
  
  if (textCount > 2) {
    errors.push(`Too many text operations: ${textCount} (max 2)`);
  }
  
  if (visualRatio < 0.6) {
    errors.push(`Visual ratio too low: ${(visualRatio * 100).toFixed(1)}% (need >= 60%)`);
  }
  
  const valid = errors.length === 0;
  
  logger.debug(`[validator] Chunk validation: ${visualCount} visual, ${textCount} text, ratio=${(visualRatio*100).toFixed(1)}%, valid=${valid}`);
  if (!valid) {
    logger.warn(`[validator] Validation failed: ${errors.join(', ')}`);
  }
  
  return {
    valid,
    visualCount,
    textCount,
    visualRatio,
    errors,
    needsRetry: !valid
  };
}

export function validateStepActions(actions: any[]): ValidationResult {
  // For full step validation
  let totalVisual = 0;
  let totalText = 0;
  const allErrors: string[] = [];
  
  // Process in chunks of 5 actions
  const chunkSize = 5;
  for (let i = 0; i < actions.length; i += chunkSize) {
    const chunk = actions.slice(i, i + chunkSize);
    const result = validateChunk(chunk);
    
    totalVisual += result.visualCount;
    totalText += result.textCount;
    
    if (!result.valid) {
      allErrors.push(`Chunk ${Math.floor(i/chunkSize) + 1}: ${result.errors.join(', ')}`);
    }
  }
  
  const totalOps = totalVisual + totalText;
  const overallRatio = totalOps > 0 ? totalVisual / totalOps : 0;
  
  // Step must be at least 60% visual overall (more reasonable)
  if (overallRatio < 0.6) {
    allErrors.push(`Overall visual ratio too low: ${(overallRatio * 100).toFixed(1)}%`);
  }
  
  const valid = allErrors.length === 0;
  
  logger.debug(`[validator] Step validation: ${totalVisual} visual, ${totalText} text, ratio=${(overallRatio*100).toFixed(1)}%, valid=${valid}`);
  
  return {
    valid,
    visualCount: totalVisual,
    textCount: totalText,
    visualRatio: overallRatio,
    errors: allErrors,
    needsRetry: !valid
  };
}
