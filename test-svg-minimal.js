const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: './app/backend/.env' });

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 4096,
    topK: 40,
    topP: 0.9
  }
});

const prompt = `Write a script of code in 2D SIMPLE pure SVG code with focused minimal clear animation for: "oxygen atoms"

Create a 2D representation of oxygen molecules moving. Show red oxygen atoms (circular, #ff0000) bouncing around in a container. Animate them moving left to right with different speeds. Label: 'Oxygen Atoms (O2)'.

Code length: not more than 250 lines. The animation should use <animate>, <animateMotion>, or <animateTransform> elements with repeatCount="indefinite" for continuous motion. Include labeled text elements that clearly identify all components.

Label all relevant elements with their scientific names. Use full-color visuals with appropriate colors for the domain.

NOTE: My compiler is just SVG compiler, so output ONLY pure SVG code. NO surrounding HTML, external CSS, or JavaScript. Start with <?xml version="1.0"?> and use proper SVG namespace.

OUTPUT ONLY THE PURE SVG CODE:`;

async function test() {
  console.log('[TEST] Sending prompt...');
  console.log('[TEST] Prompt length:', prompt.length, 'chars (~', Math.ceil(prompt.length / 4), 'tokens)');
  
  try {
    const result = await model.generateContent(prompt);
    
    console.log('[TEST] Response received');
    console.log('[TEST] Candidates:', result.response.candidates?.length || 0);
    
    if (result.response.candidates && result.response.candidates.length > 0) {
      const candidate = result.response.candidates[0];
      console.log('[TEST] Finish reason:', candidate.finishReason);
      console.log('[TEST] Safety ratings:', JSON.stringify(candidate.safetyRatings));
      
      const text = result.response.text();
      console.log('[TEST] Output length:', text.length, 'chars');
      console.log('[TEST] First 500 chars:', text.substring(0, 500));
      
      if (text.includes('<svg')) {
        console.log('[TEST] ✅ SVG FOUND!');
      } else {
        console.log('[TEST] ❌ NO SVG IN OUTPUT');
      }
    } else {
      console.log('[TEST] ❌ NO CANDIDATES');
    }
  } catch (error) {
    console.error('[TEST] ❌ ERROR:', error.message);
  }
}

test();
