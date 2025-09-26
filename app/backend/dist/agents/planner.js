"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plannerAgent = plannerAgent;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const MODEL = 'gemini-2.5-flash';
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
    const prompt = `Create 5-step plan for: ${query}
Return JSON:
{
  "title": "short title",
  "subtitle": "one line description",
  "toc": [
    {"minute": 1, "title": "Intro", "summary": "basics"},
    {"minute": 2, "title": "Core", "summary": "main ideas"},
    {"minute": 3, "title": "Examples", "summary": "demos"},
    {"minute": 4, "title": "Practice", "summary": "apply"},
    {"minute": 5, "title": "Review", "summary": "recap"}
  ],
  "steps": [
    {"id": 1, "desc": "intro", "compiler": "js", "complexity": 1, "tag": "part_1"},
    {"id": 2, "desc": "concepts", "compiler": "js", "complexity": 1, "tag": "part_2"},
    {"id": 3, "desc": "examples", "compiler": "js", "complexity": 1, "tag": "part_3"},
    {"id": 4, "desc": "practice", "compiler": "js", "complexity": 1, "tag": "part_4"},
    {"id": 5, "desc": "summary", "compiler": "js", "complexity": 1, "tag": "part_5"}
  ]
}`;
    const t0 = Date.now();
    logger_1.logger.debug('[planner] Sending prompt to Gemini...');
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
    if (!Array.isArray(plan.steps) || plan.steps.length !== 5)
        throw new Error('Planner: steps must be exactly 5');
    plan.steps.forEach((s, i) => { if (!s.id)
        s.id = i + 1; });
    return plan;
}
