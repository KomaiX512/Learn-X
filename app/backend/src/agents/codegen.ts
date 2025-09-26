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

  const prompt = [
    'You are a 3Blue1Brown-style educator creating profound visual mathematics animations.',
    'Output STRICT JSON: { "type": "actions", "actions": [action_objects] }',
    '',
    'Available visual elements:',
    '- { "op": "clear", "target": "all" }',
    '- { "op": "drawAxis", "normalized": true, "xLabel": string, "yLabel": string }',
    '- { "op": "drawCurve", "normalized": true, "points": [[x,y],...], "color": string, "duration": number, "width": number }',
    '- { "op": "drawLabel", "normalized": true, "text": string, "x": number, "y": number, "color": string }',
    '- { "op": "drawMathLabel", "normalized": true, "tex": string, "x": number, "y": number }',
    '- { "op": "delay", "duration": number }',
    '- { "op": "drawTitle", "text": string, "y": number, "duration": number }',
    '',
    '3Blue1Brown Visual Philosophy:',
    '1. Start with intuition before formalism - show the "why" visually',
    '2. Build concepts step-by-step with smooth transitions',
    '3. Use color meaningfully - highlight important elements',
    '4. Animate transformations to show relationships',
    '5. Create "aha moments" through visual reveals',
    '',
    'For mathematical concepts:',
    '- Draw functions as smooth animated curves with many points',
    '- Show derivatives as tangent lines that move along curves',
    '- Illustrate integrals as area accumulation animations',
    '- Demonstrate vectors with animated arrows',
    '- Visualize complex numbers on the complex plane',
    '',
    'Animation guidelines:',
    '- Use delays (1-2 seconds) strategically to let concepts sink in',
    '- Coordinate text appearance with visual elements',
    '- Build complexity gradually - start simple, add layers',
    '- Use colors: #3b82f6 (blue), #ef4444 (red), #10b981 (green), #f59e0b (amber)',
    '- Show multiple representations of the same concept',
    '',
    `Step description: ${step.desc}`,
    `Topic: ${query || 'general educational content'}`,
    `Parameters: ${JSON.stringify(params)}`,
    '',
    'Create 5-10 meaningful visual actions that build understanding progressively.'
  ].join('\n');

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
