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
    // Common JSON fixes
    let fixed = jsonText
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double
        .replace(/\\n/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    // Try to balance braces and brackets
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    // Add missing closing braces/brackets
    for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed += '}';
    }
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixed += ']';
    }
    return fixed;
}
async function plannerAgent(query) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error('Missing GEMINI_API_KEY');
    }
    const genAI = new generative_ai_1.GoogleGenerativeAI(key);
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
    {"id": 1, "desc": "[Hook with visual + build intuitive understanding]", "compiler": "js", "complexity": 2, "tag": "intuition"},
    {"id": 2, "desc": "[Show exact mechanism with clear examples]", "compiler": "js", "complexity": 3, "tag": "mechanics"},
    {"id": 3, "desc": "[Real-world applications and implications]", "compiler": "js", "complexity": 2, "tag": "applications"}
  ]
}

⚠️ REQUIREMENTS:
- EXACTLY 3 steps (not 5)
- Each description must be specific and visual
- Use actual topic terms, not generic placeholders
- Keep focused - this is a quick lesson

Topic: ${query}`;
    const t0 = Date.now();
    logger_1.logger.debug('[planner] Sending enhanced prompt to Gemini...');
    const res = await withTimeout(model.generateContent(prompt), DEFAULT_TIMEOUT, 'planner/gemini');
    const t1 = Date.now();
    logger_1.logger.debug(`[planner] Received response from Gemini in ${t1 - t0}ms`);
    const text = res.response.text();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1)
        throw new Error('Planner: no JSON in response');
    let jsonText = text.slice(jsonStart, jsonEnd + 1).replace(/```json|```/g, '').trim();
    // Try parsing, if it fails, attempt to fix and retry
    let plan;
    try {
        plan = JSON.parse(jsonText);
        logger_1.logger.debug('[planner] JSON parsed successfully on first attempt');
    }
    catch (firstError) {
        logger_1.logger.debug(`[planner] JSON parse failed, attempting to fix: ${firstError}`);
        const fixedJson = fixJsonSyntax(jsonText);
        try {
            plan = JSON.parse(fixedJson);
            logger_1.logger.debug('[planner] JSON parsed successfully after syntax fix');
        }
        catch (secondError) {
            logger_1.logger.error(`[planner] JSON parse failed completely: ${secondError}`);
            throw new Error(`Failed to parse planner response: ${secondError}`);
        }
    }
    if (!plan.title || !plan.subtitle)
        throw new Error('Planner: missing title/subtitle');
    if (!Array.isArray(plan.toc) || plan.toc.length < 1)
        throw new Error('Planner: missing toc');
    if (!Array.isArray(plan.steps) || plan.steps.length !== 3)
        throw new Error('Planner: steps must be exactly 3');
    plan.steps.forEach((s, i) => { if (!s.id)
        s.id = i + 1; });
    return plan;
}
