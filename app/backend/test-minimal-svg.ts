/**
 * MINIMAL TEST: Single SVG Generation with Full Logging
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function minimalTest() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ No API key');
    process.exit(1);
  }

  console.log('🧪 MINIMAL SVG GENERATION TEST\n');
  console.log('Model: gemini-2.0-flash-exp');
  console.log('Task: Generate simple blood flow SVG\n');

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 8000,
      topK: 50,
      topP: 0.95
    },
    systemInstruction: 'You are a pure SVG code generator. Output ONLY complete SVG code. Start with <?xml version="1.0" standalone="no"?> and end with </svg>. NO markdown, NO explanations.'
  });

  const prompt = `Write a script of code in 2D SIMPLE pure SVG code for educational purposes.

Topic: "Blood Flow"
Description: "Show red blood cells flowing through a vessel"

Code length: Not more than 150 lines.

The visual should show blood cells moving through a vessel with SMIL animations.
Label the cells and vessel clearly.

IMPORTANT:
- Pure SVG only - NO HTML, NO CSS, NO JavaScript
- Start with <?xml version="1.0" standalone="no"?>
- Use viewBox (like "0 0 800 600")
- Include <style> and <defs>
- Use <animateMotion> for cell movement
- Include 5+ labeled text elements

OUTPUT:
- Output ONLY complete SVG code
- NO markdown, NO code blocks
- Start with <?xml
- End with </svg>

Generate the SVG now:`;

  console.log('📤 Sending request to Gemini...\n');
  
  try {
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const genTime = Date.now() - startTime;
    
    console.log(`⏱️  Generation time: ${genTime}ms\n`);

    if (!result || !result.response) {
      console.error('❌ No response object');
      return;
    }

    console.log('📊 Response Analysis:');
    console.log(`  - promptFeedback: ${JSON.stringify(result.response.promptFeedback || 'none')}`);
    console.log(`  - candidates count: ${result.response.candidates?.length || 0}`);
    
    if (result.response.candidates && result.response.candidates.length > 0) {
      const candidate = result.response.candidates[0];
      console.log(`  - finishReason: ${candidate.finishReason}`);
      console.log(`  - safetyRatings: ${JSON.stringify(candidate.safetyRatings || [])}`);
      
      try {
        const text = result.response.text();
        console.log(`\n✅ Generated text length: ${text.length} chars`);
        console.log(`\n📝 First 200 chars:\n${text.substring(0, 200)}\n`);
        console.log(`📝 Last 200 chars:\n${text.substring(text.length - 200)}\n`);
        
        // Save to file
        if (text.length > 0) {
          fs.writeFileSync('test-minimal-output.svg', text, 'utf-8');
          console.log('💾 Saved to: test-minimal-output.svg');
        }
        
      } catch (err: any) {
        console.error(`❌ Error calling text(): ${err.message}`);
      }
    } else {
      console.error('❌ No candidates in response');
      console.log('\n🔍 Full response:', JSON.stringify(result.response, null, 2).substring(0, 1000));
    }

  } catch (error: any) {
    console.error(`\n❌ FAILED: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
  }
}

minimalTest();
