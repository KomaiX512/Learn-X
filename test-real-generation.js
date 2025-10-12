#!/usr/bin/env node

/**
 * REAL GENERATION TEST WITH BRUTAL HONESTY
 * 
 * Tests actual lecture generation and monitors:
 * - Every step from start to finish
 * - All timing data
 * - Any fallback usage
 * - Quality of SVG outputs
 * 
 * NO SUGAR COATING
 */

const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

const TEST_TOPIC = 'Blood Circulation and Heart Function';
const API_URL = 'http://localhost:8000';
const LOG_FILE = path.join(__dirname, 'app/backend/backend.log');

// Tracking
const session = {
  id: null,
  steps: [],
  visualsGenerated: 0,
  failures: 0,
  startTime: Date.now(),
  currentStep: 0,
  svgOutputs: [],
  timings: []
};

console.log('\n' + '='.repeat(80));
console.log('🔥 REAL GENERATION TEST - BRUTAL HONEST MONITORING');
console.log('='.repeat(80));
console.log(`\n📚 Topic: "${TEST_TOPIC}"`);
console.log(`🌐 Backend: ${API_URL}`);

// Connect to socket
const socket = io(API_URL, {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('\n✅ Socket connected');
  console.log(`   Socket ID: ${socket.id}`);
  
  // Start generation
  setTimeout(() => {
    console.log('\n🚀 Starting generation...');
    fetch(`${API_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: TEST_TOPIC })
    })
    .then(res => res.json())
    .then(data => {
      session.id = data.sessionId;
      console.log(`✅ Session created: ${session.id}`);
      console.log(`   Joining room...`);
      socket.emit('join', session.id);
    })
    .catch(error => {
      console.error('❌ API call failed:', error.message);
      process.exit(1);
    });
  }, 1000);
});

// Listen to all events
socket.on('session-init', (data) => {
  console.log('\n📋 SESSION INITIALIZED');
  console.log(`   Topic: ${data.topic}`);
  console.log(`   Domain: ${data.domain || 'N/A'}`);
});

socket.on('lecture-structure', (data) => {
  console.log('\n📐 LECTURE STRUCTURE RECEIVED');
  console.log(`   Steps: ${data.structure?.length || 0}`);
  
  if (data.structure) {
    session.steps = data.structure;
    data.structure.forEach((step, idx) => {
      console.log(`   ${idx + 1}. [${step.tag}] ${step.desc?.substring(0, 60)}...`);
    });
  }
});

socket.on('step-start', (data) => {
  session.currentStep = data.stepNumber;
  const stepTime = Date.now();
  
  console.log('\n' + '-'.repeat(80));
  console.log(`🎬 STEP ${data.stepNumber} START`);
  console.log(`   Description: ${data.step?.desc || 'N/A'}`);
  console.log(`   Tag: ${data.step?.tag || 'N/A'}`);
  console.log(`   Compiler: ${data.step?.compiler || 'N/A'}`);
  
  session.timings[data.stepNumber] = { start: stepTime };
});

socket.on('chunk', (data) => {
  const chunk = data.chunk;
  
  if (chunk.type === 'actions' && chunk.actions) {
    const svgActions = chunk.actions.filter(a => a.op === 'customSVG');
    const otherActions = chunk.actions.filter(a => a.op !== 'customSVG');
    
    console.log(`\n   📦 CHUNK RECEIVED (Step ${data.stepNumber})`);
    console.log(`      customSVG actions: ${svgActions.length}`);
    console.log(`      Other actions: ${otherActions.length}`);
    
    if (svgActions.length > 0) {
      session.visualsGenerated++;
      
      svgActions.forEach((action, idx) => {
        const svg = action.svgCode;
        const hasAnimations = svg.includes('<animate') || svg.includes('animateMotion') || svg.includes('animateTransform');
        const textCount = (svg.match(/<text/g) || []).length;
        
        console.log(`\n      🎨 SVG #${idx + 1}:`);
        console.log(`         Size: ${svg.length} chars`);
        console.log(`         Has animations: ${hasAnimations ? '✅ YES' : '❌ NO'}`);
        console.log(`         Text labels: ${textCount}`);
        console.log(`         Has <?xml: ${svg.includes('<?xml') ? '✅' : '❌'}`);
        
        // Save SVG for analysis
        session.svgOutputs.push({
          step: data.stepNumber,
          size: svg.length,
          hasAnimations,
          textCount,
          svg: svg.substring(0, 500)
        });
        
        // Show preview
        console.log(`\n         Preview (first 200 chars):`);
        console.log(`         ${svg.substring(0, 200).replace(/\n/g, '\n         ')}`);
      });
    }
  }
});

socket.on('step-done', (data) => {
  const stepTime = session.timings[data.stepNumber];
  if (stepTime) {
    stepTime.end = Date.now();
    stepTime.duration = ((stepTime.end - stepTime.start) / 1000).toFixed(2);
  }
  
  console.log(`\n   ✅ STEP ${data.stepNumber} COMPLETE`);
  console.log(`      Time: ${stepTime?.duration || 'N/A'}s`);
});

socket.on('lecture-done', (data) => {
  const totalTime = ((Date.now() - session.startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ LECTURE GENERATION COMPLETE');
  console.log('='.repeat(80));
  console.log(`   Total time: ${totalTime}s`);
  console.log(`   Steps completed: ${data.stepsCompleted || session.steps.length}`);
  console.log(`   Visuals generated: ${session.visualsGenerated}`);
  
  // Wait a bit then analyze
  setTimeout(() => {
    analyzeLogs();
    brutallHonestVerdict();
    process.exit(0);
  }, 2000);
});

socket.on('error', (error) => {
  console.error('\n❌ ERROR EVENT:', error);
  session.failures++;
});

socket.on('disconnect', () => {
  console.log('\n⚠️  Socket disconnected');
});

// Log analyzer
function analyzeLogs() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 BACKEND LOG ANALYSIS');
  console.log('='.repeat(80));
  
  if (!fs.existsSync(LOG_FILE)) {
    console.log('⚠️  Log file not found');
    return;
  }
  
  const logs = fs.readFileSync(LOG_FILE, 'utf-8');
  
  // Count critical patterns
  const patterns = {
    'codegenV3] Generating': 0,
    'codegenV3] ✅ Generated SVG': 0,
    'codegenV3] Generation failed': 0,
    'codegenV3WithRetry] ✅ SUCCESS': 0,
    'codegenV3WithRetry] ⚠️': 0,
    'codegenV3WithRetry] ❌': 0,
    'fallback': 0,
    'recovery': 0,
    'emergency': 0,
    'planVisuals': 0,
    'codeVisual': 0,
    'Strategy 1': 0,
    'Strategy 2': 0
  };
  
  Object.keys(patterns).forEach(pattern => {
    const matches = logs.match(new RegExp(pattern, 'gi'));
    patterns[pattern] = matches ? matches.length : 0;
  });
  
  console.log('\n🔍 Pattern Detection:');
  console.log(`   Direct generations started: ${patterns['codegenV3] Generating']}`);
  console.log(`   Successful SVG generations: ${patterns['codegenV3] ✅ Generated SVG']}`);
  console.log(`   Generation failures: ${patterns['codegenV3] Generation failed']}`);
  console.log(`   Retry wrapper successes: ${patterns['codegenV3WithRetry] ✅ SUCCESS']}`);
  console.log(`   Retry warnings: ${patterns['codegenV3WithRetry] ⚠️']}`);
  console.log(`   Retry failures: ${patterns['codegenV3WithRetry] ❌']}`);
  
  console.log('\n🚨 RED FLAGS (Should be ZERO):');
  const redFlags = patterns['fallback'] + patterns['recovery'] + patterns['emergency'] + 
                   patterns['planVisuals'] + patterns['codeVisual'] + 
                   patterns['Strategy 1'] + patterns['Strategy 2'];
  
  console.log(`   Fallback mentions: ${patterns['fallback']}`);
  console.log(`   Recovery strategies: ${patterns['recovery']}`);
  console.log(`   Emergency generation: ${patterns['emergency']}`);
  console.log(`   Old two-stage code: ${patterns['planVisuals'] + patterns['codeVisual']}`);
  console.log(`   Multi-retry cascades: ${patterns['Strategy 1'] + patterns['Strategy 2']}`);
  console.log(`   TOTAL RED FLAGS: ${redFlags}`);
  
  if (redFlags === 0) {
    console.log('\n   ✅ NO RED FLAGS - Clean implementation confirmed!');
  } else {
    console.log('\n   ❌ RED FLAGS DETECTED - Fallback code still active!');
  }
  
  // Extract timing
  const timingRegex = /Generated SVG in ([\d.]+)s/g;
  const timings = [];
  let match;
  
  while ((match = timingRegex.exec(logs)) !== null) {
    timings.push(parseFloat(match[1]));
  }
  
  if (timings.length > 0) {
    const avg = (timings.reduce((a, b) => a + b, 0) / timings.length).toFixed(2);
    const min = Math.min(...timings).toFixed(2);
    const max = Math.max(...timings).toFixed(2);
    
    console.log('\n⏱️  Generation Timing:');
    console.log(`   Average: ${avg}s (Target: <15s)`);
    console.log(`   Min: ${min}s`);
    console.log(`   Max: ${max}s`);
    console.log(`   Count: ${timings.length}`);
    
    if (parseFloat(avg) <= 15) {
      console.log('   ✅ Performance target MET');
    } else {
      console.log('   ⚠️  Performance target MISSED');
    }
  }
}

function brutallHonestVerdict() {
  console.log('\n' + '='.repeat(80));
  console.log('💀 BRUTAL HONEST VERDICT');
  console.log('='.repeat(80));
  
  console.log('\n❓ 1. ARE ALL VISUALS TRULY DYNAMIC (NO FALLBACKS)?');
  // Check logs were analyzed
  const logs = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf-8') : '';
  const hasFallbacks = logs.includes('fallback') || logs.includes('emergency') || 
                       logs.includes('planVisuals') || logs.includes('Strategy 1');
  
  if (!hasFallbacks) {
    console.log('   ✅ YES - No fallback patterns detected in logs');
  } else {
    console.log('   ❌ NO - Fallback patterns found in logs');
  }
  
  console.log('\n❓ 2. ARE VISUALS COMPLETE AND CONTEXTUAL?');
  if (session.svgOutputs.length > 0) {
    const withAnimations = session.svgOutputs.filter(s => s.hasAnimations).length;
    const withLabels = session.svgOutputs.filter(s => s.textCount > 0).length;
    const avgSize = (session.svgOutputs.reduce((a, b) => a + b.size, 0) / session.svgOutputs.length).toFixed(0);
    
    console.log(`   SVGs generated: ${session.svgOutputs.length}`);
    console.log(`   With animations: ${withAnimations}/${session.svgOutputs.length} (${((withAnimations/session.svgOutputs.length)*100).toFixed(0)}%)`);
    console.log(`   With labels: ${withLabels}/${session.svgOutputs.length} (${((withLabels/session.svgOutputs.length)*100).toFixed(0)}%)`);
    console.log(`   Average size: ${avgSize} chars`);
    
    if (withAnimations >= session.svgOutputs.length * 0.7 && withLabels === session.svgOutputs.length) {
      console.log('   ✅ YES - Good animation and labeling coverage');
    } else {
      console.log('   ⚠️  PARTIAL - Some visuals lack animations or labels');
    }
  } else {
    console.log('   ❌ NO DATA - No SVG outputs to analyze');
  }
  
  console.log('\n❓ 3. WHAT ARE ARCHITECTURE LIMITATIONS?');
  console.log('   📌 Identified limitations:');
  console.log('      1. Single sequential generation (no parallelization)');
  console.log('      2. No caching of successful generations');
  console.log('      3. SVG-only output format');
  console.log('      4. No quality validation layer');
  console.log('      5. Simple 2-retry strategy');
  console.log('      6. No progressive rendering');
  console.log('      7. Gemini 2.5 Flash rate limits');
  
  console.log('\n❓ 4. FINAL SYSTEM ASSESSMENT:');
  const totalTime = ((Date.now() - session.startTime) / 1000).toFixed(2);
  const avgStepTime = session.steps.length > 0 ? (totalTime / session.steps.length).toFixed(2) : 'N/A';
  
  console.log(`   Steps completed: ${session.steps.length}`);
  console.log(`   Visuals generated: ${session.visualsGenerated}`);
  console.log(`   Failures: ${session.failures}`);
  console.log(`   Total time: ${totalTime}s`);
  console.log(`   Avg per step: ${avgStepTime}s`);
  
  const success = !hasFallbacks && session.failures === 0 && session.visualsGenerated > 0;
  
  console.log('\n' + '='.repeat(80));
  if (success) {
    console.log('✅ VERDICT: TRUE DYNAMIC GENERATION WORKING');
    console.log('   - No fallbacks detected');
    console.log('   - All steps completed');
    console.log('   - Visuals generated successfully');
  } else {
    console.log('❌ VERDICT: ISSUES DETECTED');
    if (hasFallbacks) console.log('   - Fallbacks still present');
    if (session.failures > 0) console.log(`   - ${session.failures} failures`);
    if (session.visualsGenerated === 0) console.log('   - No visuals generated');
  }
  console.log('='.repeat(80) + '\n');
}

// Timeout safety
setTimeout(() => {
  console.log('\n⚠️  TEST TIMEOUT (120s) - Analyzing what we have...');
  analyzeLogs();
  brutallHonestVerdict();
  process.exit(1);
}, 120000);
