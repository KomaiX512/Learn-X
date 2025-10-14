import { GoogleGenerativeAI } from '@google/generative-ai';
import { Plan } from '../types';
import { logger } from '../logger';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';  // Primary model - highest RPM
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
  // ULTRA-ROBUST JSON FIXER - preserves LaTeX and mathematical notation
  let fixed = jsonText;
  
  // 1. Remove markdown code blocks
  fixed = fixed.replace(/```json|```/gi, '').trim();
  
  // 2. CRITICAL: Temporarily escape LaTeX expressions to protect them
  // Match $...$ patterns (LaTeX inline math) and protect backslashes
  const latexPatterns: string[] = [];
  fixed = fixed.replace(/\$([^$]+)\$/g, (match) => {
    latexPatterns.push(match);
    return `__LATEX_${latexPatterns.length - 1}__`;
  });
  
  // 3. Now safely remove literal backslash-n (newlines) which break JSON
  fixed = fixed.replace(/\\n/g, ' ');
  fixed = fixed.replace(/\\t/g, ' ');
  fixed = fixed.replace(/\\r/g, ' ');
  
  // 4. Restore LaTeX patterns
  latexPatterns.forEach((pattern, idx) => {
    // Escape backslashes in LaTeX for JSON
    const escapedPattern = pattern.replace(/\\/g, '\\\\');
    fixed = fixed.replace(`__LATEX_${idx}__`, escapedPattern);
  });
  
  // 5. Remove trailing commas before } or ]
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  
  // 6. Fix smart quotes and special dashes (do this before other string processing)
  fixed = fixed.replace(/'/g, "'");
  fixed = fixed.replace(/"/g, '"');
  fixed = fixed.replace(/"/g, '"');
  fixed = fixed.replace(/–/g, '-');
  fixed = fixed.replace(/—/g, '-');
  
  // 7. Remove control characters that break JSON (but not backslashes)
  fixed = fixed.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, ' ');
  
  // 8. Balance braces and brackets
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

export async function plannerAgent(query: string): Promise<Plan> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `Create a FOCUSED 3-step educational lesson for: ${query}

🎯 GOAL: Teach core concept quickly (~2-3 minutes total)

📚 EXACTLY 3 STEPS:
1. HOOK & INTUITION: Start with why it matters + build intuitive understanding
2. CORE MECHANICS: Show how it actually works with clear examples
3. APPLICATIONS: Connect to real-world use and deeper implications

🎯 OUTPUT STRICT JSON:
{
  "title": "[Clear, direct title]",
  "subtitle": "[One sentence describing what they'll learn]",
  "toc": [
    {"minute": 1, "title": "The Intuition", "summary": "[Core idea in simple terms]"},
    {"minute": 2, "title": "How It Works", "summary": "[The mechanism explained]"},
    {"minute": 3, "title": "Real Applications", "summary": "[Where this matters]"}
  ],
  "steps": [
    {
      "id": 1,
      "desc": "[Hook with visual narrative - for visual generator]",
      "notesSubtopic": "[Clear 2-3 word subtopic - for notes generator]",
      "compiler": "js",
      "complexity": 2,
      "tag": "intuition"
    },
    {
      "id": 2,
      "desc": "[Show mechanism with visual narrative - for visual generator]",
      "notesSubtopic": "[Clear 2-3 word subtopic - for notes generator]",
      "compiler": "js",
      "complexity": 3,
      "tag": "mechanics"
    },
    {
      "id": 3,
      "desc": "[Real applications with visual narrative - for visual generator]",
      "notesSubtopic": "[Clear 2-3 word subtopic - for notes generator]",
      "compiler": "js",
      "complexity": 2,
      "tag": "applications"
    }
  ]
}

⚠️ CRITICAL REQUIREMENTS:
- EXACTLY 3 steps (not 5)
- TWO DESCRIPTIONS PER STEP:
  * "desc": Narrative, visual description (for animations/visuals) - can be long, storytelling
  * "notesSubtopic": Clear, concise subtopic (for educational notes) - 2-5 words, what to teach
- Use actual topic terms, not generic placeholders
- Keep focused - this is a quick lesson

EXAMPLES:
Topic: "Operational Amplifiers"
Step 1:
  desc: "Imagine you have a tiny whisper from a microphone, too faint to hear. The Op-Amp amplifies this signal thousands of times, turning whispers into roars."
  notesSubtopic: "Op-Amp Basics"

Topic: "Quantum Mechanics"
Step 1:
  desc: "Picture an electron not as a tiny ball, but as a cloud of probability, existing everywhere at once until observed."
  notesSubtopic: "Wave-Particle Duality"

Topic: ${query}`;

  const t0 = Date.now();
  logger.debug('[planner] Sending enhanced prompt to Gemini...');
  const res = await withTimeout(model.generateContent(prompt), DEFAULT_TIMEOUT, 'planner/gemini');
  const t1 = Date.now();
  logger.debug(`[planner] Received response from Gemini in ${t1 - t0}ms`);
  let text = '';
  try {
    text = res.response.text();
  } catch {}
  if (!text || text.trim().length === 0) {
    const candidate: any = (res as any)?.response?.candidates?.[0];
    const parts = candidate?.content?.parts;
    if (Array.isArray(parts)) {
      text = parts.map((p: any) => p?.text || '').join('').trim();
    }
  }
  if (!text || text.trim().length === 0) {
    throw new Error('Planner: empty LLM response');
  }

  // Log raw response for debugging
  logger.debug(`[planner] Raw response (first 500 chars): ${text.slice(0, 500)}...`);
  
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('Planner: no JSON in response');
  
  let jsonText = text.slice(jsonStart, jsonEnd + 1).replace(/```json|```/g, '').trim();
  logger.debug(`[planner] Extracted JSON (length: ${jsonText.length})`);
  
  // Try parsing, if it fails, attempt to fix and retry
  let plan: Plan;
  try {
    plan = JSON.parse(jsonText) as Plan;
    logger.debug('[planner] JSON parsed successfully on first attempt');
  } catch (firstError: any) {
    logger.debug(`[planner] JSON parse failed, attempting to fix: ${firstError.message}`);
    
    // Try to log the problematic area
    const posMatch = firstError.message.match(/position (\d+)/);
    if (posMatch) {
      const pos = parseInt(posMatch[1]);
      const start = Math.max(0, pos - 50);
      const end = Math.min(jsonText.length, pos + 50);
      logger.debug(`[planner] Problem area around position ${pos}: ...${jsonText.slice(start, end)}...`);
    }
    
    const fixedJson = fixJsonSyntax(jsonText);
    logger.debug(`[planner] Fixed JSON (length: ${fixedJson.length})`);
    
    try {
      plan = JSON.parse(fixedJson) as Plan;
      logger.debug('[planner] JSON parsed successfully after syntax fix');
    } catch (secondError: any) {
      logger.error(`[planner] JSON parse failed completely: ${secondError.message}`);
      logger.error(`[planner] Failed JSON (first 1000 chars): ${fixedJson.slice(0, 1000)}`);
      throw new Error(`Failed to parse planner response: ${secondError.message}`);
    }
  }

  if (!plan.title || !plan.subtitle) throw new Error('Planner: missing title/subtitle');
  if (!Array.isArray(plan.toc) || plan.toc.length < 1) throw new Error('Planner: missing toc');
  if (!Array.isArray(plan.steps) || plan.steps.length !== 3) throw new Error('Planner: steps must be exactly 3');
  plan.steps.forEach((s, i) => { if (!s.id) s.id = i + 1; });

  return plan;
}
