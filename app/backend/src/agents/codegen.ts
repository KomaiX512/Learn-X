import { GoogleGenerativeAI } from '@google/generative-ai';
import { Action, PlanStep, RenderChunk, SessionParams } from '../types';
import { logger } from '../logger';

const MODEL = 'gemini-2.5-flash';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function buildFallbackChunk(step: PlanStep, _params: SessionParams, query?: string): RenderChunk {
  // Fallback disabled
  return {
    type: 'actions',
    stepId: step.id,
    actions: []
  };
}

// Regex-based fallback extractor for Gemini outputs that are not strict JSON
function extractActionsFromText(text: string): Action[] {
  // Remove code fences and normalize whitespace
  let t = text.replace(/```json|```/g, '').replace(/[“”]/g, '"').replace(/[’]/g, "'");
  t = t.replace(/\s+/g, ' ').trim();

  // Find actions array region
  const actionsMatch = t.match(/"actions"\s*:\s*\[(.*)\]/s);
  if (!actionsMatch) return [];
  const body = actionsMatch[1];

  // Split into naive object blocks
  const objMatches = body.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
  const actions: Action[] = [];

  for (const block of objMatches) {
    const op = (block.match(/"op"\s*:\s*"([^"]+)"/) || [])[1];
    if (!op) continue;

    if (op === 'clear') {
      const target = (block.match(/"target"\s*:\s*"([^"]+)"/) || [])[1] as 'all' | 'layer' | undefined;
      actions.push({ op: 'clear', target: (target === 'layer' ? 'layer' : 'all') });
      continue;
    }

    if (op === 'drawAxis') {
      const xLabel = (block.match(/"xLabel"\s*:\s*"([^"]*)"/) || [])[1] || 'x';
      const yLabel = (block.match(/"yLabel"\s*:\s*"([^"]*)"/) || [])[1] || 'y';
      actions.push({ op: 'drawAxis', normalized: true, xLabel, yLabel } as any);
      continue;
    }

    if (op === 'drawLabel') {
      const text = (block.match(/"text"\s*:\s*"([\s\S]*?)"/) || [])[1]?.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim() || '';
      const x = parseFloat((block.match(/"x"\s*:\s*([0-9\.\-eE]+)/) || [])[1] || '0.1');
      const y = parseFloat((block.match(/"y"\s*:\s*([0-9\.\-eE]+)/) || [])[1] || '0.1');
      const color = (block.match(/"color"\s*:\s*"([^"]+)"/) || [])[1];
      const normalized = /"normalized"\s*:\s*true/.test(block) ? true : true; // default to true
      actions.push({ op: 'drawLabel', normalized, text, x, y, color } as any);
      continue;
    }

    if (op === 'drawMathLabel') {
      const tex = (block.match(/"tex"\s*:\s*"([\s\S]*?)"/) || [])[1]?.replace(/\\n/g, ' ').trim() || '';
      const x = parseFloat((block.match(/"x"\s*:\s*([0-9\.\-eE]+)/) || [])[1] || '0.1');
      const y = parseFloat((block.match(/"y"\s*:\s*([0-9\.\-eE]+)/) || [])[1] || '0.1');
      const normalized = /"normalized"\s*:\s*true/.test(block) ? true : true;
      actions.push({ op: 'drawMathLabel', normalized, tex, x, y } as any);
      continue;
    }

    if (op === 'drawCurve') {
      // Parse points: [[x,y], ...]
      const ptsBlock = (block.match(/"points"\s*:\s*\[\s*(\[[^\]]*\](?:\s*,\s*\[[^\]]*\])*)\s*\]/) || [])[1];
      const points: [number, number][] = [];
      if (ptsBlock) {
        const pairMatches = ptsBlock.match(/\[\s*([0-9\.\-eE]+)\s*,\s*([0-9\.\-eE]+)\s*\]/g) || [];
        for (const pm of pairMatches) {
          const m = pm.match(/\[\s*([0-9\.\-eE]+)\s*,\s*([0-9\.\-eE]+)\s*\]/);
          if (m) points.push([parseFloat(m[1]), parseFloat(m[2])]);
        }
      }
      const color = (block.match(/"color"\s*:\s*"([^"]+)"/) || [])[1] || '#0b82f0';
      const duration = parseFloat((block.match(/"duration"\s*:\s*([0-9\.\-eE]+)/) || [])[1] || '1.0');
      const width = parseFloat((block.match(/"width"\s*:\s*([0-9\.\-eE]+)/) || [])[1] || '2');
      const normalized = /"normalized"\s*:\s*true/.test(block) ? true : true;
      if (points.length) actions.push({ op: 'drawCurve', normalized, points, color, duration, width } as any);
      continue;
    }
  }

  return actions;
}
export async function codegenAgent(step: PlanStep, params: SessionParams = {}, query?: string): Promise<RenderChunk> {
  logger.debug(`[codegen] START: stepId=${step.id} tag=${step.tag}`, { params, query });

  // FORCE EVERYTHING TO GO TO GEMINI - NO HARDCODED CONTENT
  logger.debug(`[codegen] Processing tag=${step.tag} - sending to Gemini for dynamic generation`);

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    logger.debug(`codegenAgent: No GEMINI_API_KEY for tag=${step.tag}, using minimal fallback.`);
    return {
      type: 'actions',
      stepId: step.id,
      actions: [
        { op: 'drawAxis', normalized: true, xLabel: 'x', yLabel: 'y' },
        { op: 'drawLabel', normalized: true, text: step.desc || String(step.tag) || 'Lesson step', x: 0.08, y: 0.08, color: '#333' }
      ]
    };
  }

  let raw = "";
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: MODEL });

    const prompt = [
      'You are a Codegen Agent. Generate from first principles. Create stepwise, teacher-like animated drawing instructions for a 2D canvas.',
      'Output MUST be STRICT JSON with shape: { "type": "actions", "actions": [action_objects] }',
      'Available actions:',
      '- { "op": "clear", "target": "all"|"layer" }',
      '- { "op": "drawAxis", "normalized": true, "xLabel": string, "yLabel": string }',
      '- { "op": "drawCurve", "normalized": true, "points": [[x,y],...], "color": string, "duration": number, "width": number }',
      '- { "op": "drawLabel", "normalized": true, "text": string, "x": number, "y": number, "color": string }',
      '- { "op": "drawMathLabel", "normalized": true, "tex": string, "x": number, "y": number }',
      'Guidelines:',
      '- Use normalized coordinates (0.0 to 1.0) for positioning.',
      '- Ensure elements do not overlap; space them intelligently.',
      '- For graphs, draw axes first, then curves, then labels.',
      '- Animate curves with duration 1.0-2.0 seconds.',
      '- Use appropriate colors and positioning.',
      `- Step description: ${step.desc}`,
      query ? `- Original query: ${query}` : '',
      `- Session params: ${JSON.stringify(params)}`
    ].filter(Boolean).join('\n');

    logger.debug(`[codegen] Sending prompt to Gemini for tag=${step.tag}`);
    const res = await model.generateContent(prompt);
    logger.debug(`[codegen] Received response from Gemini for tag=${step.tag}`);
    raw = res.response.text();
    logger.debug(`[codegen] Raw response length: ${raw.length}, snippet: ${raw.substring(0, 240)}...`);
    
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('Codegen did not return JSON.');
    }
    
    // Aggressive JSON cleaning to fix Gemini escaping issues
    let jsonText = raw.slice(jsonStart, jsonEnd + 1);
    // Strip code fences if present
    jsonText = jsonText.replace(/```json|```/g, "");
    // Normalize smart quotes
    jsonText = jsonText.replace(/[“”]/g, '"').replace(/[’]/g, "'");
    // Fix common escape issues
    jsonText = jsonText.replace(/\\"/g, '"');
    jsonText = jsonText.replace(/\\'/g, "'");
    jsonText = jsonText.replace(/\\\\/g, "\\");
    jsonText = jsonText.replace(/\\n/g, " ");
    jsonText = jsonText.replace(/\\t/g, " ");
    jsonText = jsonText.replace(/\\r/g, " ");
    jsonText = jsonText.replace(/\n/g, " ");
    jsonText = jsonText.replace(/\r/g, " ");
    jsonText = jsonText.replace(/\t/g, " ");
    // Remove invalid backslash escapes (any backslash not followed by a valid json escape)
    jsonText = jsonText.replace(/\\(?!["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "");
    // Remove trailing commas before } or ]
    jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
    // Collapse excessive whitespace
    jsonText = jsonText.replace(/\s+/g, " ").trim();
    
    logger.debug(`[codegen] Cleaned JSON text: ${jsonText}`);
    const chunk = JSON.parse(jsonText) as RenderChunk;
    if (!chunk.actions || !Array.isArray(chunk.actions)) {
      throw new Error('Invalid actions format');
    }
    chunk.stepId = step.id;
    logger.debug(`[codegen] END: stepId=${step.id} tag=${step.tag} (Gemini)`);
    return chunk;
  } catch (err) {
    logger.debug(`codegenAgent: Gemini error for tag=${step.tag}, attempting regex extraction. ${String(err)}`);
    const actions = extractActionsFromText(raw);
    if (actions.length) {
      logger.debug(`[codegen] Regex extraction succeeded with ${actions.length} actions`);
      return { type: 'actions', stepId: step.id, actions };
    }
    logger.debug(`codegenAgent: Regex extraction failed, throwing error.`);
    // Fallback disabled, re-throw error to propagate it
    throw err;
  }
}
