import { GoogleGenerativeAI } from '@google/generative-ai';
import { Action, PlanStep, RenderChunk, SessionParams } from '../types';
import { logger } from '../logger';

const MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT = Number(process.env.LLM_TIMEOUT_MS || 60000);

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  logger.debug(`[timeout] Setting ${ms}ms timeout for ${label}`);
  return Promise.race([
    p,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        logger.debug(`[timeout] ${label} timed out after ${ms}ms`);
        reject(new Error(`${label} timeout after ${ms}ms`));
      }, ms);
      p.finally(() => clearTimeout(timer));
    })
  ]) as Promise<T>;
}

function fixJsonSyntax(jsonText: string): string {
  let fixed = jsonText
    .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
    .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote unquoted keys
    .replace(/:\s*'([^']*)'/g, ': "$1"')  // Replace single quotes with double
    .replace(/\\n/g, ' ')  // Replace newlines with spaces
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();
  
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/\]/g) || []).length;
  
  for (let i = 0; i < openBraces - closeBraces; i++) {
    fixed += '}';
  }
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    fixed += ']';
  }
  
  return fixed;
}

export async function codegenAgent(
  step: PlanStep,
  params: SessionParams = {},
  query?: string,
  onChunk?: (chunk: RenderChunk) => void
): Promise<RenderChunk> {
  logger.debug(`[codegen] START: stepId=${step.id} tag=${step.tag}`, { params, query });

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not set - NO FALLBACKS ALLOWED');
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `Create 2-3 visual actions for: ${step.desc}
Topic: ${query || 'general'}
Output JSON only:
{
  "type": "actions",
  "actions": [
    {"op": "drawTitle", "text": "title here", "y": 0.1},
    {"op": "drawLabel", "normalized": true, "text": "text", "x": 0.2, "y": 0.3}
  ]
}
Use ops: drawTitle, drawLabel, drawCurve, drawAxis, drawMathLabel, drawParticles, delay`;

  logger.debug(`[codegen] Sending prompt to Gemini for tag=${step.tag}`);
  const res = await withTimeout(model.generateContent(prompt), DEFAULT_TIMEOUT, 'codegen/gemini');
  const text = res.response.text();
  logger.debug(`[codegen] Received response from Gemini for tag=${step.tag}, length: ${text.length}`);

  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('No JSON found in response - NO FALLBACKS');
  }
  let jsonText = text.slice(jsonStart, jsonEnd + 1);
  jsonText = jsonText.replace(/```json|```/g, "").trim();
  
  let chunk: RenderChunk;
  try {
    chunk = JSON.parse(jsonText) as RenderChunk;
    logger.debug('[codegen] JSON parsed successfully on first attempt');
  } catch (firstError) {
    logger.debug(`[codegen] JSON parse failed, attempting to fix: ${firstError}`);
    const fixedJson = fixJsonSyntax(jsonText);
    try {
      chunk = JSON.parse(fixedJson) as RenderChunk;
      logger.debug('[codegen] JSON parsed successfully after syntax fix');
    } catch (secondError) {
      logger.error(`[codegen] JSON parse failed completely: ${secondError}`);
      throw new Error(`Failed to parse codegen response: ${secondError}`);
    }
  }
  
  if (!chunk.actions || !Array.isArray(chunk.actions)) {
    throw new Error('Invalid actions in response - NO FALLBACKS');
  }
  
  chunk.stepId = step.id;
  logger.debug(`[codegen] SUCCESS: Generated ${chunk.actions.length} actions for step ${step.id}`);
  return chunk;
}
