import { GoogleGenerativeAI } from '@google/generative-ai';
import { Plan } from '../types';
import { logger } from '../logger';

const MODEL = 'gemini-2.5-flash';

export async function plannerAgent(query: string): Promise<Plan> {
  const key = process.env.GEMINI_API_KEY;
  // ONLY use fallback if there's no API key - otherwise force Gemini generation
  const fallbackPlan: Plan = {
    title: 'Learning Topic',
    steps: [
      { id: 1, desc: 'Introduction and overview', compiler: 'js', complexity: 2, tag: 'intro' },
      { id: 2, desc: 'Main concepts', compiler: 'js', complexity: 3, tag: 'concepts' },
      { id: 3, desc: 'Examples and applications', compiler: 'js', complexity: 3, tag: 'examples' }
    ]
  };

  if (!key) {
    logger.debug('plannerAgent: No GEMINI_API_KEY, using fallback plan.');
    return fallbackPlan;
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: MODEL });

    const prompt = [
      'You are a world-class educator and planner. Your goal is to create a comprehensive, step-by-step lesson plan for any given query.',
      'Use the "first principle" technique: break down complex topics into their fundamental concepts.',
      'The lesson should be structured like a teacher writing on a blackboard, with each step building upon the previous one.',
      'Output STRICT JSON with shape: { "title": string, "steps": [{ "id": number, "desc": string, "compiler": "js"|"latex"|"wasm-py", "complexity": number, "tag": string }] }',
      'Guidelines:',
      '- Start with a clear, bolded title for the lesson.',
      '- The first few steps should introduce the topic and outline the parts to be discussed.',
      '- Ensure the lesson flows logically from introduction to conclusion.',
      '- Use "js" for visual and labeling chunks for the browser canvas.',
      '- Use "latex" for mathematical equations (client uses MathJax).',
      '- Use "wasm-py" for heavy numeric simulations.',
      '- Generate a comprehensive plan with a variable number of steps as needed to fully explain the topic.',
      `Query: ${query}`
    ].join('\\n');

    const res = await model.generateContent(prompt);
    const text = res.response.text();
    logger.debug(`[planner] Raw response length: ${text.length}`);
    
    // NUCLEAR APPROACH: Extract manually using regex instead of JSON.parse
    const titleMatch = text.match(/"title"\s*:\s*"([^"\\]+(\\.[^"\\]*)*)"/);
    const stepsArrayMatch = text.match(/"steps"\s*:\s*\[(.*?)\]/s);
    
    if (!titleMatch || !stepsArrayMatch) {
      throw new Error('Could not extract title or steps from response');
    }
    
    const title = titleMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
    logger.debug(`[planner] Extracted title: ${title}`);
    
    // Extract individual step objects using regex
    const stepObjects = [];
    const stepMatches = stepsArrayMatch[1].match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
    
    for (let i = 0; i < stepMatches.length; i++) {
      const stepText = stepMatches[i];
      
      const idMatch = stepText.match(/"id"\s*:\s*(\d+)/) || [null, i + 1];
      const descMatch = stepText.match(/"desc"\s*:\s*"([^"\\]+(\\.[^"\\]*)*)"/) || [null, `Step ${i + 1}`];
      const compilerMatch = stepText.match(/"compiler"\s*:\s*"([^"]*)"/) || [null, 'js'];
      const complexityMatch = stepText.match(/"complexity"\s*:\s*(\d+)/) || [null, 2];
      const tagMatch = stepText.match(/"tag"\s*:\s*"([^"]*)"/) || [null, `step_${i + 1}`];
      
      stepObjects.push({
        id: parseInt(idMatch[1] as string),
        desc: descMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim(),
        compiler: compilerMatch[1] as 'js' | 'latex' | 'wasm-py',
        complexity: parseInt(complexityMatch[1] as string),
        tag: tagMatch[1]
      });
    }
    
    const plan = { title, steps: stepObjects };
    logger.debug(`[planner] Extracted plan with ${plan.steps.length} steps`);
    if (!plan.steps?.length) throw new Error('Empty plan');
    return plan;
  } catch (err) {
    logger.debug(`plannerAgent: Gemini error, using fallback. ${String(err)}`);
    return fallbackPlan;
  }
}
