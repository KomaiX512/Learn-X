#!/usr/bin/env node
require('dotenv').config({ path: './app/backend/.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  console.log('\n🔥 TESTING gemini-2.5-flash MODEL\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('❌ GEMINI_API_KEY not set');
    process.exit(1);
  }
  
  console.log('✅ API Key found');
  console.log('🔄 Testing model: gemini-2.5-flash\n');
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: 'You are an SVG generator. Output ONLY SVG code.',
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 8192
      }
    });
    
    console.log('⏳ Sending test request...\n');
    const startTime = Date.now();
    
    const result = await model.generateContent('Create a simple SVG circle with label "Test"');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const text = result.response.text();
    
    console.log(`✅ SUCCESS in ${duration}s`);
    console.log(`📝 Response length: ${text.length} chars`);
    console.log(`\n📄 First 300 chars:\n${text.substring(0, 300)}\n`);
    
    if (text.includes('<svg') || text.includes('<?xml')) {
      console.log('✅ Valid SVG detected');
    } else {
      console.log('⚠️  No SVG tags found');
    }
    
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}\n`);
    console.log('Error details:', error);
    process.exit(1);
  }
}

test();
