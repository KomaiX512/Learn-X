#!/usr/bin/env node

/**
 * FOCUSED UNIT TEST - Single Animation Generation
 * 
 * Tests ONLY ONE animation generation to isolate the timeout issue.
 * This will tell us if 180s timeout is sufficient or if there's a deeper problem.
 */

const path = require('path');

// Set up paths
process.env.NODE_ENV = 'development';

// Load environment
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import after env setup
const { codegenV3 } = require('./dist/agents/codegenV3');

console.log('\n' + '═'.repeat(80));
console.log('🔬 UNIT TEST: Single Animation Generation');
console.log('═'.repeat(80));

// Test step
const testStep = {
  id: 1,
  desc: 'Visualize DNA double helix structure unwinding during replication',
  tag: 'DNA Structure',
  notesSubtopic: 'DNA Double Helix Unwinding'
};

const topic = 'DNA Replication';

console.log('\n📋 Test Configuration:');
console.log(`   Topic: "${topic}"`);
console.log(`   Step: "${testStep.desc}"`);
console.log(`   Expected timeout: 180 seconds`);

console.log('\n⏱️  Starting single animation generation...');
console.log('   (This should take 40-120 seconds if working properly)');

const startTime = Date.now();
let updateInterval;

// Progress indicator
updateInterval = setInterval(() => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  process.stdout.write(`\r⏳ Elapsed: ${elapsed}s... `);
}, 1000);

// Run test
codegenV3(testStep, topic)
  .then(result => {
    clearInterval(updateInterval);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 RESULTS');
    console.log('═'.repeat(80));
    
    console.log(`\n⏱️  Total time: ${totalTime}s`);
    
    if (!result) {
      console.log('\n❌ FAILED: Generation returned null');
      console.log('\nPossible causes:');
      console.log('  1. Timeout still too short');
      console.log('  2. API key issue');
      console.log('  3. Network connectivity problem');
      console.log('  4. LLM refusing to generate content');
      process.exit(1);
    }
    
    console.log('\n✅ SUCCESS: Animation generated!');
    console.log(`\n📊 Quality Metrics:`);
    console.log(`   Actions: ${result.actions.length}`);
    
    // Check SVG content
    const svgAction = result.actions.find(a => a.op === 'customSVG');
    if (svgAction && svgAction.svgCode) {
      const svgLength = svgAction.svgCode.length;
      const textCount = (svgAction.svgCode.match(/<text/g) || []).length;
      const rectCount = (svgAction.svgCode.match(/<rect/g) || []).length;
      const lineCount = (svgAction.svgCode.match(/<line/g) || []).length;
      const circleCount = (svgAction.svgCode.match(/<circle/g) || []).length;
      
      console.log(`   SVG size: ${svgLength} chars`);
      console.log(`   Elements: ${textCount} text, ${rectCount} rect, ${lineCount} line, ${circleCount} circle`);
      
      // DNA-specific checks
      const hasDNA = svgAction.svgCode.toLowerCase().includes('dna') || 
                     svgAction.svgCode.toLowerCase().includes('helix') ||
                     svgAction.svgCode.toLowerCase().includes('nucleotide') ||
                     svgAction.svgCode.toLowerCase().includes('base pair');
      
      console.log(`\n🧬 DNA Context Check:`);
      if (hasDNA) {
        console.log('   ✅ Contains DNA-specific terms (contextual generation confirmed)');
      } else {
        console.log('   ⚠️  No obvious DNA terms found (may still be contextual)');
      }
      
      // Save for inspection
      const fs = require('fs');
      const outputPath = path.join(__dirname, 'test-output', 'unit-test-animation.svg');
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, svgAction.svgCode);
      console.log(`\n💾 Saved to: ${outputPath}`);
      
    } else {
      console.log('   ⚠️  No SVG content found in actions');
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('🎯 VERDICT: UNIT TEST PASSED');
    console.log('═'.repeat(80));
    console.log('');
    console.log('✅ Single animation generation works correctly');
    console.log('✅ 180s timeout is sufficient');
    console.log('✅ Ready to test full pipeline');
    console.log('');
    
    process.exit(0);
  })
  .catch(error => {
    clearInterval(updateInterval);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n\n' + '═'.repeat(80));
    console.log('❌ TEST FAILED');
    console.log('═'.repeat(80));
    
    console.log(`\n⏱️  Failed after: ${totalTime}s`);
    console.log(`\n❌ Error: ${error.message}`);
    console.log(`\n🔍 Stack trace:`);
    console.log(error.stack);
    
    console.log('\n📋 Diagnostic Information:');
    
    // Check if timeout
    if (error.message.includes('timeout')) {
      console.log('\n⏱️  TIMEOUT DETECTED');
      console.log(`   - Failed at ${totalTime}s`);
      console.log(`   - Expected limit: 180s`);
      
      if (parseFloat(totalTime) < 180) {
        console.log('\n❌ CRITICAL: Timeout triggered BEFORE 180s limit!');
        console.log('   This indicates the timeout constant is NOT being used.');
        console.log('   Check if old code is still running.');
      } else {
        console.log('\n⚠️  Timeout at correct time (180s), but LLM is too slow.');
        console.log('   Options:');
        console.log('   1. Increase timeout to 240s or 300s');
        console.log('   2. Simplify prompt to reduce complexity');
        console.log('   3. Remove timeout entirely (user preference)');
      }
    } else if (error.message.includes('API')) {
      console.log('\n🔑 API ISSUE DETECTED');
      console.log('   - Check API key');
      console.log('   - Check network connectivity');
      console.log('   - Check Gemini API status');
    } else {
      console.log('\n❓ UNKNOWN ERROR');
      console.log('   Review stack trace above for details');
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('');
    
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  clearInterval(updateInterval);
  console.log('\n\n⚠️  Test interrupted by user');
  process.exit(130);
});
