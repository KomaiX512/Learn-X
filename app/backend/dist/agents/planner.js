"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plannerAgent = plannerAgent;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
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
    const prompt = `You are creating a 3Blue1Brown-style educational journey for: ${query}

🎓 EDUCATIONAL PHILOSOPHY:
- Start with WHY: Build curiosity and motivation
- Use FIRST PRINCIPLES: Break complex topics into fundamental concepts
- PROGRESSIVE DEPTH: Each step builds on previous understanding
- VISUAL INTUITION: Every concept should be visualizable
- PRACTICAL APPLICATION: Connect theory to real-world usage

📚 LEARNING STAGES (EXACTLY 5 STEPS):
1. CURIOSITY HOOK: Begin with an intriguing question or paradox that motivates learning
2. FOUNDATIONAL INTUITION: Build core mental models using analogies and simple cases
3. MATHEMATICAL FORMALISM: Introduce precise definitions and relationships
4. DEEP EXPLORATION: Examine edge cases, variations, and advanced applications
5. SYNTHESIS & MASTERY: Connect all concepts into a unified understanding

🎯 OUTPUT STRICT JSON:
{
  "title": "[Concise, engaging title]",
  "subtitle": "[One-line description that sparks curiosity]",
  "toc": [
    {"minute": 1, "title": "The Hook", "summary": "[Question that creates need to know]"},
    {"minute": 2, "title": "Building Intuition", "summary": "[Core mental models]"},
    {"minute": 3, "title": "The Mathematics", "summary": "[Formal framework]"},
    {"minute": 4, "title": "Going Deeper", "summary": "[Advanced insights]"},
    {"minute": 5, "title": "The Big Picture", "summary": "[Unified understanding]"}
  ],
  "steps": [
    {"id": 1, "desc": "[Curiosity-driven introduction with visual hook]", "compiler": "js", "complexity": 1, "tag": "hook"},
    {"id": 2, "desc": "[Build intuition through analogies and simple examples]", "compiler": "js", "complexity": 2, "tag": "intuition"},
    {"id": 3, "desc": "[Introduce mathematical formalism with visual proofs]", "compiler": "js", "complexity": 3, "tag": "formalism"},
    {"id": 4, "desc": "[Explore variations and edge cases]", "compiler": "js", "complexity": 4, "tag": "exploration"},
    {"id": 5, "desc": "[Synthesize understanding with real applications]", "compiler": "js", "complexity": 5, "tag": "mastery"}
  ]
}

⚠️ CRITICAL REQUIREMENTS:
- Each step description MUST be specific to the topic
- Complexity increases progressively (1→5)
- Tags reflect learning stage, not just "part_N"
- Descriptions should guide visualization approach
- NEVER use generic placeholders

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
    if (!Array.isArray(plan.steps) || plan.steps.length !== 5)
        throw new Error('Planner: steps must be exactly 5');
    plan.steps.forEach((s, i) => { if (!s.id)
        s.id = i + 1; });
    return plan;
}
