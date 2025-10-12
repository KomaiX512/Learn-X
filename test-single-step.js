#!/usr/bin/env node

/**
 * SINGLE STEP TEST - Quick diagnosis
 */

require('dotenv').config({ path: './app/backend/.env' });
const { codegenV3 } = require('./app/backend/dist/agents/codegenV3');

async function test() {
  console.log('\n🧪 Testing single step generation...\n');
  
  const step = {
    id: 1,
    tag: 'hook',
    desc: 'Blood vessels transport oxygen',
    compiler: 'actions'
  };
  
  const topic = 'Blood Circulation';
  
  console.log(`Topic: ${topic}`);
  console.log(`Step: ${step.desc}\n`);
  console.log('⏳ Calling codegenV3...\n');
  
  try {
    const result = await codegenV3(step, topic);
    
    if (result) {
      console.log('\n✅ SUCCESS!');
      console.log(`Actions: ${result.actions.length}`);
      if (result.actions[0] && result.actions[0].svgCode) {
        const svg = result.actions[0].svgCode;
        console.log(`SVG size: ${svg.length} chars`);
        console.log(`\nFirst 300 chars:`);
        console.log(svg.substring(0, 300));
      }
    } else {
      console.log('\n❌ FAILED: Result was null');
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

test();
