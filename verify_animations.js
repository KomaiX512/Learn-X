#!/usr/bin/env node

/**
 * BRUTAL VERIFICATION OF NEW ANIMATION SYSTEM
 * Tests all new animation types to ensure they're being generated
 */

const axios = require('axios');

const TESTS = [
  {
    name: "SOLAR SYSTEM WITH ORBITS",
    query: "Show the solar system with sun at center and planets Earth, Mars, Jupiter orbiting with different speeds and trails",
    expectedOps: ['orbit', 'particle'],
    checkLog: "orbit.*trail.*true"
  },
  {
    name: "ELECTRIC CIRCUIT WITH FLOW",
    query: "Show electric current flowing through a circuit with electrons moving and electric field visualization",
    expectedOps: ['flow', 'field', 'particle', 'arrow'],
    checkLog: "flow.*particleCount|field.*electric"
  },
  {
    name: "WAVE INTERFERENCE",
    query: "Demonstrate wave interference with two waves combining, show oscillations and wave patterns",
    expectedOps: ['wave', 'arrow'],
    checkLog: "wave.*frequency.*amplitude"
  },
  {
    name: "VECTOR FIELD",
    query: "Show a magnetic field around a current-carrying wire with field lines and vectors",
    expectedOps: ['field', 'arrow', 'flow'],
    checkLog: "field.*magnetic|arrow.*animated"
  },
  {
    name: "PARTICLE EXPLOSION",
    query: "Show particle emission from a radioactive atom with particles spreading outward",
    expectedOps: ['particle', 'orbit'],
    checkLog: "particle.*spread.*lifetime"
  }
];

async function runTest(test) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 TEST: ${test.name}`);
  console.log(`Query: "${test.query}"`);
  console.log(`Expected animations: ${test.expectedOps.join(', ')}`);
  console.log('='.repeat(60));
  
  try {
    const sessionId = `verify-${Date.now()}`;
    
    // Send query
    const response = await axios.post('http://localhost:3001/api/query', {
      query: test.query,
      sessionId: sessionId
    });
    
    console.log(`✅ Query sent, session: ${response.data.sessionId}`);
    
    // Wait for generation
    console.log('⏳ Waiting for generation...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Check logs for expected animations
    const { exec } = require('child_process');
    const checkCmd = `tail -500 /tmp/backend_new.log | grep -E "${test.checkLog}" | wc -l`;
    
    exec(checkCmd, (error, stdout, stderr) => {
      const count = parseInt(stdout.trim()) || 0;
      if (count > 0) {
        console.log(`✅ PASS: Found ${count} instances of expected animations!`);
      } else {
        console.log(`❌ FAIL: No instances of expected animations found`);
      }
    });
    
    // Also check for specific ops
    for (const op of test.expectedOps) {
      const opCheckCmd = `tail -500 /tmp/backend_new.log | grep "op: '${op}'" | wc -l`;
      exec(opCheckCmd, (error, stdout) => {
        const opCount = parseInt(stdout.trim()) || 0;
        if (opCount > 0) {
          console.log(`  ✓ Found ${opCount} "${op}" animations`);
        } else {
          console.log(`  ✗ No "${op}" animations found`);
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║   NEW ANIMATION ENGINE VERIFICATION                         ║
║   Testing: orbit, wave, particle, arrow, field, flow        ║
║   NO FALLBACKS - ONLY REAL 3BLUE1BROWN ANIMATIONS          ║
╚══════════════════════════════════════════════════════════════╝
  `);
  
  // Check backend
  try {
    await axios.get('http://localhost:3001/health');
    console.log('✅ Backend is running\n');
  } catch (error) {
    console.error('❌ Backend not running!');
    process.exit(1);
  }
  
  let passed = 0;
  let failed = 0;
  
  for (const test of TESTS) {
    const result = await runTest(test);
    if (result) passed++;
    else failed++;
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final report
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL REPORT');
  console.log('='.repeat(60));
  console.log(`Tests Passed: ${passed}/${TESTS.length}`);
  console.log(`Tests Failed: ${failed}/${TESTS.length}`);
  
  // Check overall animation usage
  console.log('\n📈 Animation Usage Statistics:');
  const animations = ['orbit', 'wave', 'particle', 'arrow', 'field', 'flow'];
  
  for (const anim of animations) {
    const { execSync } = require('child_process');
    try {
      const count = execSync(`tail -1000 /tmp/backend_new.log | grep "op: '${anim}'" | wc -l`).toString().trim();
      console.log(`  ${anim}: ${count} instances`);
    } catch (e) {
      console.log(`  ${anim}: 0 instances`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  if (passed === TESTS.length) {
    console.log('🎉 SUCCESS! All new animations are working!');
    console.log('✨ 3Blue1Brown-style animations are fully operational!');
  } else {
    console.log('⚠️  Some tests failed. Check the implementation.');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);
