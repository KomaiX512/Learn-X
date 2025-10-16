"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plannerAgent = plannerAgent;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'; // Primary model - highest RPM
const DEFAULT_TIMEOUT = Number(process.env.LLM_TIMEOUT_MS || 60000);
function withTimeout(p, ms, label) {
    logger_1.logger.debug(`[timeout] Setting ${ms}ms timeout for ${label}`);
    return Promise.race([
        p,
        new Promise((_, reject) => {
            const timer = setTimeout(() => {
                logger_1.logger.debug(`[timeout] ${label} timed out after ${ms}ms`);
                reject(new Error(`${label} timeout after ${ms}ms`));
            }, ms);
            p.finally(() => clearTimeout(timer));
        })
    ]);
}
function fixJsonSyntax(jsonText) {
    // ULTRA-ROBUST JSON FIXER - preserves LaTeX and mathematical notation
    let fixed = jsonText;
    // 1. Remove markdown code blocks
    fixed = fixed.replace(/```json|```/gi, '').trim();
    // 2. CRITICAL: Temporarily escape LaTeX expressions to protect them
    // Match $...$ patterns (LaTeX inline math) and protect backslashes
    const latexPatterns = [];
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
async function plannerAgent(query, difficulty = 'hard') {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error('Missing GEMINI_API_KEY');
    }
    // Determine number of steps based on difficulty
    const stepCount = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
    logger_1.logger.info(`[Planner] Difficulty: ${difficulty}, Steps: ${stepCount}`);
    const genAI = new generative_ai_1.GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: MODEL });
    const prompt = `Create a FOCUSED ${stepCount}-step educational lesson for: ${query}

🎯 GOAL: Teach core concept quickly (~${stepCount} minute${stepCount > 1 ? 's' : ''} total)

📚 EXACTLY ${stepCount} STEP${stepCount > 1 ? 'S' : ''}:
${stepCount >= 1 ? '1. HOOK & INTUITION: Start with why it matters + build intuitive understanding\n' : ''}${stepCount >= 2 ? '2. CORE MECHANICS: Show how it actually works with clear examples\n' : ''}${stepCount >= 3 ? '3. APPLICATIONS: Connect to real-world use and deeper implications' : ''}

🎯 OUTPUT STRICT JSON:
{
  "title": "[Clear, direct title]",
  "subtitle": "[One sentence describing what they'll learn]",
  "toc": [
    ${stepCount >= 1 ? '{"minute": 1, "title": "The Intuition", "summary": "[Core idea in simple terms]"}' : ''}${stepCount >= 2 ? ',\n    {"minute": 2, "title": "How It Works", "summary": "[The mechanism explained]"}' : ''}${stepCount >= 3 ? ',\n    {"minute": 3, "title": "Real Applications", "summary": "[Where this matters]"}' : ''}
  ],
  "steps": [
    ${stepCount >= 1 ? '{\n      "id": 1,\n      "desc": "[Hook with visual narrative - for visual generator]",\n      "notesSubtopic": "[Clear 2-3 word subtopic - for notes generator]",\n      "compiler": "js",\n      "complexity": 2,\n      "tag": "intuition"\n    }' : ''}${stepCount >= 2 ? ',\n    {\n      "id": 2,\n      "desc": "[Show mechanism with visual narrative - for visual generator]",\n      "notesSubtopic": "[Clear 2-3 word subtopic - for notes generator]",\n      "compiler": "js",\n      "complexity": 3,\n      "tag": "mechanics"\n    }' : ''}${stepCount >= 3 ? ',\n    {\n      "id": 3,\n      "desc": "[Real applications with visual narrative - for visual generator]",\n      "notesSubtopic": "[Clear 2-3 word subtopic - for notes generator]",\n      "compiler": "js",\n      "complexity": 2,\n      "tag": "applications"\n    }' : ''}
  ]
}

⚠️ CRITICAL REQUIREMENTS:
- EXACTLY ${stepCount} step${stepCount > 1 ? 's' : ''} (not more, not less)
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
    logger_1.logger.debug('[planner] Sending enhanced prompt to Gemini...');
    const res = await withTimeout(model.generateContent(prompt), DEFAULT_TIMEOUT, 'planner/gemini');
    const t1 = Date.now();
    logger_1.logger.debug(`[planner] Received response from Gemini in ${t1 - t0}ms`);
    let text = '';
    try {
        text = res.response.text();
    }
    catch { }
    if (!text || text.trim().length === 0) {
        const candidate = res?.response?.candidates?.[0];
        const parts = candidate?.content?.parts;
        if (Array.isArray(parts)) {
            text = parts.map((p) => p?.text || '').join('').trim();
        }
    }
    if (!text || text.trim().length === 0) {
        throw new Error('Planner: empty LLM response');
    }
    // Log raw response for debugging
    logger_1.logger.debug(`[planner] Raw response (first 500 chars): ${text.slice(0, 500)}...`);
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1)
        throw new Error('Planner: no JSON in response');
    let jsonText = text.slice(jsonStart, jsonEnd + 1).replace(/```json|```/g, '').trim();
    logger_1.logger.debug(`[planner] Extracted JSON (length: ${jsonText.length})`);
    // Try parsing, if it fails, attempt to fix and retry
    let plan;
    try {
        plan = JSON.parse(jsonText);
        logger_1.logger.debug('[planner] JSON parsed successfully on first attempt');
    }
    catch (firstError) {
        logger_1.logger.debug(`[planner] JSON parse failed, attempting to fix: ${firstError.message}`);
        // Try to log the problematic area
        const posMatch = firstError.message.match(/position (\d+)/);
        if (posMatch) {
            const pos = parseInt(posMatch[1]);
            const start = Math.max(0, pos - 50);
            const end = Math.min(jsonText.length, pos + 50);
            logger_1.logger.debug(`[planner] Problem area around position ${pos}: ...${jsonText.slice(start, end)}...`);
        }
        const fixedJson = fixJsonSyntax(jsonText);
        logger_1.logger.debug(`[planner] Fixed JSON (length: ${fixedJson.length})`);
        try {
            plan = JSON.parse(fixedJson);
            logger_1.logger.debug('[planner] JSON parsed successfully after syntax fix');
        }
        catch (secondError) {
            logger_1.logger.error(`[planner] JSON parse failed completely: ${secondError.message}`);
            logger_1.logger.error(`[planner] Failed JSON (first 1000 chars): ${fixedJson.slice(0, 1000)}`);
            throw new Error(`Failed to parse planner response: ${secondError.message}`);
        }
    }
    if (!plan.title || !plan.subtitle)
        throw new Error('Planner: missing title/subtitle');
    if (!Array.isArray(plan.toc) || plan.toc.length < 1)
        throw new Error('Planner: missing toc');
    if (!Array.isArray(plan.steps) || plan.steps.length !== stepCount) {
        throw new Error(`Planner: steps must be exactly ${stepCount} (got ${plan.steps?.length || 0})`);
    }
    plan.steps.forEach((s, i) => { if (!s.id)
        s.id = i + 1; });
    logger_1.logger.info(`[Planner] ✅ Generated ${plan.steps.length} step(s) for difficulty: ${difficulty}`);
    return plan;
}
