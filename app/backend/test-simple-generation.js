/**
 * SIMPLIFIED TEST: Minimal prompt to test API
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

async function testSimpleGeneration() {
  console.log('Testing Gemini API with minimal prompt...\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ No API key');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',  
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4000,
      topK: 40,
      topP: 0.95
    },
    systemInstruction: 'You are a JSON generator. Output ONLY valid JSON.'
  });

  const simplePrompt = `Generate a JSON array of 10 simple visual operations for "DNA Replication".

Each operation MUST include a "visualGroup" field.

Structure:
- First operation: {"op":"drawTitle","text":"DNA Replication","x":0.5,"y":0.5,"visualGroup":"title"}
- Then 3 groups with heading+diagram+description

Example:
[
  {"op":"drawTitle","text":"DNA Replication","x":0.5,"y":0.5,"visualGroup":"title"},
  {"op":"drawLabel","text":"Visual 1: Structure","x":0.1,"y":0.2,"fontSize":24,"visualGroup":"heading-1"},
  {"op":"drawCircle","x":0.5,"y":0.5,"radius":0.1,"color":"#2196F3","visualGroup":"diagram-1"},
  {"op":"drawLabel","text":"The DNA double helix","x":0.1,"y":0.8,"fontSize":16,"visualGroup":"description-1"},
  {"op":"delay","duration":3000,"visualGroup":"diagram-1"},
  
  {"op":"drawLabel","text":"Visual 2: Unwinding","x":0.1,"y":0.2,"fontSize":24,"visualGroup":"heading-2"},
  {"op":"drawCircle","x":0.5,"y":0.5,"radius":0.08,"color":"#4CAF50","visualGroup":"diagram-2"},
  {"op":"drawLabel","text":"Helicase unwinds","x":0.1,"y":0.8,"fontSize":16,"visualGroup":"description-2"},
  {"op":"delay","duration":3000,"visualGroup":"diagram-2"}
]

Output ONLY the JSON array. No markdown, no explanation.`;

  try {
    console.log('Sending request...');
    const start = Date.now();
    
    const result = await model.generateContent(simplePrompt);
    const elapsed = Date.now() - start;
    
    console.log(`✅ Response received in ${elapsed}ms\n`);

    if (!result || !result.response) {
      console.error('❌ No response object');
      console.error('Result:', JSON.stringify(result, null, 2).substring(0, 500));
      process.exit(1);
    }

    if (result.response.promptFeedback?.blockReason) {
      console.error('❌ Content blocked:', result.response.promptFeedback.blockReason);
      console.error('Feedback:', JSON.stringify(result.response.promptFeedback, null, 2));
      process.exit(1);
    }

    const text = result.response.text();
    console.log(`Response length: ${text.length} chars\n`);
    console.log('First 500 chars:');
    console.log(text.substring(0, 500));
    console.log('...\n');

    // Try to parse
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const operations = JSON.parse(cleaned);

    console.log(`✅ Parsed ${operations.length} operations\n`);

    // Check visualGroup
    const withoutGroup = operations.filter(op => !op.visualGroup);
    if (withoutGroup.length > 0) {
      console.warn(`⚠️  ${withoutGroup.length} operations missing visualGroup`);
    } else {
      console.log('✅ All operations have visualGroup');
    }

    console.log('\nTest PASSED');
    return true;

  } catch (error) {
    console.error('\n❌ Test FAILED');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
    return false;
  }
}

testSimpleGeneration().then(success => {
  process.exit(success ? 0 : 1);
});
