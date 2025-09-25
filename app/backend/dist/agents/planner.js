"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plannerAgent = plannerAgent;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../logger");
const MODEL = 'gemini-2.5-flash';
async function plannerAgent(query) {
    const key = process.env.GEMINI_API_KEY;
    const fallbackPlan = {
        steps: [
            { id: 1, desc: 'Draw axes and title', compiler: 'js', complexity: 2, tag: 'rc_axes' },
            { id: 2, desc: 'Plot RC charging curve v(t)=V(1 - e^{-t/RC})', compiler: 'js', complexity: 4, tag: 'rc_curve' },
            { id: 3, desc: 'Annotate time constant tau=RC', compiler: 'js', complexity: 3, tag: 'rc_annotation' }
        ]
    };
    if (!key) {
        logger_1.logger.debug('plannerAgent: No GEMINI_API_KEY, using fallback plan.');
        return fallbackPlan;
    }
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: MODEL });
        const prompt = [
            'Handle universally: math/chem/circuits/etc. No pre-built domain-specific hacks.',
            'You are a Planner Agent. Output STRICT JSON with shape: { "steps": [{ "id": number, "desc": string, "compiler": "js"|"latex"|"wasm-py", "complexity": number, "tag": string }] }',
            'Guidelines:',
            '- Use "js" for visual and labeling chunks for browser canvas.',
            '- Use "latex" only when rendering math labels (client uses MathJax).',
            '- Use "wasm-py" for heavy numeric simulations (not needed for RC demo).',
            '- Keep 3-6 steps, stepwise like a teacher writing on a board.',
            `Query: ${query}`
        ].join('\\n');
        const res = await model.generateContent(prompt);
        const text = res.response.text();
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error('Planner did not return JSON.');
        }
        const plan = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        if (!plan.steps?.length)
            throw new Error('Empty plan');
        return plan;
    }
    catch (err) {
        logger_1.logger.debug(`plannerAgent: Gemini error, using fallback. ${String(err)}`);
        return fallbackPlan;
    }
}
