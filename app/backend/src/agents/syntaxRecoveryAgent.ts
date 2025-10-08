/**
 * SYNTAX RECOVERY AGENT
 * 
 * Uses LLM to fix malformed JSON and syntax errors
 * Last resort before failure - ensures maximum success rate
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Action } from '../types';
import { logger } from '../logger';

const MODEL = 'gemini-2.5-flash';

/**
 * Attempts to recover valid JSON array from malformed text using LLM
 */
export async function recoverJSON(malformedText: string, expectedType: 'descriptions' | 'operations'): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error('[syntaxRecovery] GEMINI_API_KEY not set');
    throw new Error('GEMINI_API_KEY not configured');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: MODEL,
    generationConfig: { 
      temperature: 0.1,  // Very low for precise JSON fixing
      maxOutputTokens: 5000 
    },
    systemInstruction: 'You are a JSON syntax fixer. Output ONLY valid JSON. Never add explanations or markdown.'
  });
  
  const promptByType = {
    descriptions: `The following text should be a JSON array of strings but has syntax errors:

${malformedText.substring(0, 2000)}

Fix ALL syntax errors and output ONLY a valid JSON array of strings:
["string1", "string2", "string3"]

Rules:
- Remove markdown formatting (backticks, code blocks)
- Fix missing/extra commas
- Fix quote mismatches
- Remove trailing commas
- Ensure proper array brackets
- NO explanations, ONLY the JSON array`,

    operations: `The following text should be a JSON array of operation objects but has syntax errors:

${malformedText.substring(0, 2000)}

Fix ALL syntax errors and output ONLY a valid JSON array:
[{"op":"operation1","x":0.5,"y":0.3}, {"op":"operation2","x":0.4,"y":0.6}]

Rules:
- Each object MUST have "op" field (not "operation")
- Remove markdown formatting
- Fix missing/extra commas and brackets
- Fix quote mismatches
- Remove trailing commas
- Ensure valid numbers (no NaN, no infinity)
- NO explanations, ONLY the JSON array`
  };
  
  try {
    logger.info(`[syntaxRecovery] Attempting to recover ${expectedType}...`);
    
    const result = await model.generateContent(promptByType[expectedType]);
    const text = result.response.text();
    
    logger.info(`[syntaxRecovery] LLM response (first 300 chars):\n${text.substring(0, 300)}`);
    
    // Strategy 1: Direct parse after cleaning
    try {
      let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      logger.info(`[syntaxRecovery] ✅ SUCCESS via Strategy 1: ${Array.isArray(parsed) ? parsed.length : 'N/A'} items`);
      return parsed;
    } catch {}
    
    // Strategy 2: Extract JSON structure
    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        logger.info(`[syntaxRecovery] ✅ SUCCESS via Strategy 2: ${Array.isArray(parsed) ? parsed.length : 'N/A'} items`);
        return parsed;
      }
    } catch {}
    
    // Strategy 3: For operations, extract individual objects
    if (expectedType === 'operations') {
      try {
        const objMatches = Array.from(text.matchAll(/\{[^{}]*"op"[^{}]*\}/g));
        const operations = objMatches.map(m => {
          try {
            return JSON.parse(m[0].replace(/,\s*}/g, '}'));
          } catch {
            return null;
          }
        }).filter(op => op !== null);
        
        if (operations.length > 0) {
          logger.info(`[syntaxRecovery] ✅ SUCCESS via Strategy 3: ${operations.length} operations`);
          return operations;
        }
      } catch {}
    }
    
    // All strategies failed
    logger.error('[syntaxRecovery] ❌ All recovery strategies failed');
    throw new Error('Syntax recovery failed - LLM could not fix JSON');
    
  } catch (error) {
    logger.error('[syntaxRecovery] ❌ Exception during recovery:', error);
    throw error;
  }
}

/**
 * COMPREHENSIVE list of ALL valid operation names from types.ts
 */
const VALID_OPERATIONS = new Set([
  'drawAxis', 'drawCurve', 'drawLabel', 'drawMathLabel', 'clear', 'delay', 'drawTitle',
  'drawCircle', 'drawRect', 'drawVector', 'drawLine', 'orbit', 'wave', 'particle',
  'arrow', 'field', 'flow', 'customPath', 'drawGraph', 'drawDiagram',
  // V2 Domain-Specific
  'drawCircuitElement', 'drawSignalWaveform', 'drawConnection', 'drawPhysicsObject',
  'drawForceVector', 'drawTrajectory', 'drawFieldLines', 'drawCellStructure',
  'drawOrganSystem', 'drawMembrane', 'drawMolecule', 'drawAtom', 'drawReaction',
  'drawBond', 'drawMolecularStructure', 'drawDataStructure', 'drawNeuralNetwork',
  'drawAlgorithmStep', 'drawFlowchart', 'drawCoordinateSystem', 'drawGeometry',
  'drawLatex', 'drawMathShape', 'drawNeuron', 'animate', 'createSimulation', 'drawAnnotation'
]);

/**
 * COMPREHENSIVE mapping of invalid/shorthand operation names to valid ones
 */
const OPERATION_MAPPING: { [key: string]: string } = {
  // Shorthand versions
  'circle': 'drawCircle',
  'rect': 'drawRect',
  'line': 'drawLine',
  'label': 'drawLabel',
  'title': 'drawTitle',
  'path': 'customPath',
  'curve': 'drawCurve',
  'axis': 'drawAxis',
  'graph': 'drawGraph',
  'vector': 'drawVector',
  'latex': 'drawLatex',
  'diagram': 'drawDiagram',
  
  // Common LLM mistakes
  'drawText': 'drawLabel',
  'text': 'drawLabel',
  'addText': 'drawLabel',
  'addLabel': 'drawLabel',
  'addSectionMarker': 'drawLabel',
  'drawImage': 'customPath',
  'image': 'customPath',
  'drawOscilloscope': 'drawSignalWaveform',
  
  // Operations that don't exist (drop them)
  'update': null,  // Not a valid operation
  'render': null,  // Not a valid operation
  'show': null,    // Not a valid operation
  'hide': null     // Not a valid operation
};

/**
 * Validates and fixes operation objects to ensure they're renderable
 */
export function validateOperations(operations: any[]): Action[] {
  if (!Array.isArray(operations)) {
    logger.error('[syntaxRecovery] validateOperations: Input is not an array');
    return [];
  }
  
  const validOps: Action[] = [];
  let mappedCount = 0;
  let droppedCount = 0;
  
  for (const op of operations) {
    // Skip if not an object
    if (!op || typeof op !== 'object') {
      logger.warn('[syntaxRecovery] Skipping non-object operation:', op);
      droppedCount++;
      continue;
    }
    
    // CRITICAL FIX: Handle "operation" field (should be "op")
    if (op.operation && !op.op) {
      op.op = op.operation;
      delete op.operation;
      logger.info(`[syntaxRecovery] Fixed field: "operation" → "op"`);
    }
    
    // Skip if no op field
    if (!op.op || typeof op.op !== 'string') {
      logger.warn('[syntaxRecovery] Skipping operation without valid "op" field:', op);
      droppedCount++;
      continue;
    }
    
    const originalOp = op.op;
    
    // Try to map invalid operation names
    if (OPERATION_MAPPING.hasOwnProperty(op.op)) {
      const mapped = OPERATION_MAPPING[op.op];
      if (mapped === null) {
        logger.warn(`[syntaxRecovery] Dropping invalid operation: ${op.op}`);
        droppedCount++;
        continue;
      }
      logger.info(`[syntaxRecovery] Mapped ${op.op} → ${mapped}`);
      op.op = mapped;
      mappedCount++;
    }
    
    // Validate against comprehensive list
    if (!VALID_OPERATIONS.has(op.op)) {
      logger.warn(`[syntaxRecovery] Unknown operation "${op.op}" - DROPPING (not in valid set)`);
      droppedCount++;
      continue;
    }
    
    // Fix common numeric issues
    for (const key in op) {
      if (typeof op[key] === 'number') {
        if (isNaN(op[key]) || !isFinite(op[key])) {
          logger.warn(`[syntaxRecovery] Fixed invalid number in ${op.op}.${key}: ${op[key]} → 0.5`);
          op[key] = 0.5; // Default to center
        }
      }
    }
    
    validOps.push(op as Action);
  }
  
  logger.info(`[syntaxRecovery] Validation complete: ${validOps.length} valid, ${mappedCount} mapped, ${droppedCount} dropped (${operations.length} input)`);
  return validOps;
}
