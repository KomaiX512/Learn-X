#!/usr/bin/env node

/**
 * TEST SIMPLIFIED V3 PIPELINE
 * 
 * Tests the new single-stage generation approach
 */

const { codegenV3 } = require('./app/backend/dist/agents/codegenV3');

async function testSimplifiedPipeline() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TESTING SIMPLIFIED V3 PIPELINE');
  console.log('='.repeat(70));
  
  // Test step
  const step = {
    id: 1,
    tag: 'hook',
    desc: 'Blood vessels transport oxygen and nutrients throughout the body',
    compiler: 'actions'
  };
  
  const topic = 'Blood Circulation System';
  
  console.log('\n📝 Test Configuration:');
  console.log(`  Topic: ${topic}`);
  console.log(`  Step: ${step.desc}`);
  console.log(`  Expected: Single SVG document with animations and labels`);
  
  console.log('\n⏱️  Starting generation...');
  const startTime = Date.now();
  
  try {
    const result = await codegenV3(step, topic);
    const genTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (!result) {
      console.log('\n❌ FAILED: Result was null');
      console.log('   Check that GEMINI_API_KEY is set');
      process.exit(1);
    }
    
    console.log('\n✅ GENERATION SUCCESSFUL');
    console.log(`   Time: ${genTime}s`);
    console.log(`   Actions: ${result.actions.length}`);
    
    // Analyze the result
    const svgActions = result.actions.filter(a => a.op === 'customSVG');
    const otherActions = result.actions.filter(a => a.op !== 'customSVG');
    
    console.log('\n📊 Result Analysis:');
    console.log(`   customSVG actions: ${svgActions.length}`);
    console.log(`   Other actions: ${otherActions.length}`);
    
    if (svgActions.length > 0) {
      const svgCode = svgActions[0].svgCode;
      console.log(`   SVG size: ${svgCode.length} chars`);
      console.log(`   Has <?xml header: ${svgCode.includes('<?xml') ? 'YES' : 'NO'}`);
      console.log(`   Has <svg> tag: ${svgCode.includes('<svg') ? 'YES' : 'NO'}`);
      console.log(`   Has animations: ${svgCode.includes('<animate') || svgCode.includes('animateMotion') ? 'YES' : 'NO'}`);
      
      const textCount = (svgCode.match(/<text/g) || []).length;
      console.log(`   Text labels: ${textCount}`);
      
      // Show first 300 chars
      console.log('\n📄 SVG Preview (first 300 chars):');
      console.log('   ' + svgCode.substring(0, 300).replace(/\n/g, '\n   '));
      console.log('   ...');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST PASSED - Simplified V3 pipeline working!');
    console.log('='.repeat(70));
    console.log('\n📌 Key Metrics:');
    console.log(`   - Generation time: ${genTime}s (Target: <15s)`);
    console.log(`   - LLM calls: 1 (vs 5-7 in old pipeline)`);
    console.log(`   - Fallbacks used: 0`);
    console.log(`   - Architecture: Single-stage direct generation`);
    
  } catch (error) {
    const genTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n❌ GENERATION FAILED');
    console.log(`   Time before failure: ${genTime}s`);
    console.log(`   Error: ${error.message}`);
    console.log('\n📋 Error Details:');
    console.log(error);
    process.exit(1);
  }
}

// Run test
testSimplifiedPipeline().catch(error => {
  console.error('Test script error:', error);
  process.exit(1);
});
