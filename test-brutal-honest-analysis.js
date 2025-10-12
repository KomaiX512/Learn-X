#!/usr/bin/env node

/**
 * BRUTAL HONEST ANALYSIS TEST
 * 
 * Tests the complete pipeline and analyzes:
 * - Is EVERY visual truly dynamic?
 * - Are there ANY fallbacks being used?
 * - Is the output complete and contextual?
 * - What are the architecture limitations?
 * 
 * NO SUGAR COATING - RAW TRUTH ONLY
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('🔥 BRUTAL HONEST ANALYSIS - REAL PIPELINE TEST');
console.log('='.repeat(80));

// Test configuration
const TEST_TOPIC = 'Photosynthesis in Plants';
const API_URL = 'http://localhost:8000';
const LOG_FILE = path.join(__dirname, 'app/backend/backend.log');

// Analysis trackers
const analysis = {
  totalSteps: 0,
  stepsWithVisuals: 0,
  stepsWithoutVisuals: 0,
  totalGenerationTime: 0,
  failures: [],
  warnings: [],
  fallbacksDetected: [],
  dynamicGenerations: [],
  timings: {},
  svgQuality: []
};

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Log analyzer
function analyzeLogs() {
  console.log('\n📊 ANALYZING BACKEND LOGS FOR FALLBACKS AND ISSUES...');
  
  if (!fs.existsSync(LOG_FILE)) {
    console.log('⚠️  Backend log file not found, creating...');
    return;
  }
  
  const logs = fs.readFileSync(LOG_FILE, 'utf-8');
  const lines = logs.split('\n');
  
  // RED FLAGS - Things that indicate fallbacks or issues
  const redFlags = {
    'fallback': 'FALLBACK DETECTED',
    'recovery': 'RECOVERY STRATEGY',
    'emergency': 'EMERGENCY GENERATION',
    'template': 'USING TEMPLATE',
    'example': 'USING EXAMPLE',
    'hardcoded': 'HARDCODED CONTENT',
    'Strategy 1': 'MULTI-RETRY CASCADE',
    'Strategy 2': 'MULTI-RETRY CASCADE',
    'planVisuals': 'OLD TWO-STAGE PIPELINE',
    'codeVisual': 'OLD TWO-STAGE PIPELINE',
    'syntaxRecovery': 'FALLBACK RECOVERY AGENT',
    'minimal operations': 'ACCEPTING PARTIAL FAILURE'
  };
  
  // GREEN FLAGS - Things that indicate success
  const greenFlags = {
    '[codegenV3] ✅ Generated SVG': 'Direct generation success',
    '[codegenV3WithRetry] ✅ SUCCESS': 'Retry wrapper success'
  };
  
  console.log('\n🔍 SCANNING FOR RED FLAGS (Fallbacks, Old Code, Issues):');
  let redFlagCount = 0;
  
  lines.forEach((line, idx) => {
    Object.entries(redFlags).forEach(([keyword, issue]) => {
      if (line.toLowerCase().includes(keyword.toLowerCase())) {
        redFlagCount++;
        console.log(`   ❌ Line ${idx + 1}: ${issue}`);
        console.log(`      ${line.substring(0, 120)}`);
        analysis.fallbacksDetected.push({ line: idx + 1, issue, content: line });
      }
    });
  });
  
  if (redFlagCount === 0) {
    console.log('   ✅ NO RED FLAGS DETECTED - Clean implementation');
  } else {
    console.log(`\n   ⚠️  TOTAL RED FLAGS: ${redFlagCount}`);
  }
  
  console.log('\n🟢 SCANNING FOR GREEN FLAGS (Successful Generations):');
  let greenFlagCount = 0;
  
  lines.forEach((line, idx) => {
    Object.entries(greenFlags).forEach(([keyword, meaning]) => {
      if (line.includes(keyword)) {
        greenFlagCount++;
        console.log(`   ✅ Line ${idx + 1}: ${meaning}`);
        console.log(`      ${line.substring(0, 120)}`);
      }
    });
  });
  
  console.log(`\n   Total successful generations: ${greenFlagCount}`);
  
  // Extract timing information
  console.log('\n⏱️  TIMING ANALYSIS:');
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
    
    console.log(`   Average: ${avg}s`);
    console.log(`   Min: ${min}s`);
    console.log(`   Max: ${max}s`);
    console.log(`   Total generations: ${timings.length}`);
    
    analysis.timings = { avg, min, max, count: timings.length, all: timings };
  }
}

// Test API call
async function testAPICall() {
  console.log('\n🚀 MAKING API REQUEST TO BACKEND...');
  console.log(`   Topic: "${TEST_TOPIC}"`);
  console.log(`   API: ${API_URL}/generate`);
  
  const startTime = Date.now();
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(`${API_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: TEST_TOPIC })
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ API RESPONSE RECEIVED (${totalTime}s)`);
    
    // Analyze response structure
    console.log('\n📦 RESPONSE ANALYSIS:');
    console.log(`   Structure steps: ${data.structure?.length || 0}`);
    console.log(`   Has session ID: ${!!data.sessionId}`);
    
    if (data.structure) {
      analysis.totalSteps = data.structure.length;
      data.structure.forEach((step, idx) => {
        console.log(`   Step ${idx + 1}: ${step.tag} - "${step.desc?.substring(0, 50)}..."`);
      });
    }
    
    console.log('\n⏳ WAITING FOR VISUAL GENERATION (30 seconds)...');
    await sleep(30000);
    
    return data;
    
  } catch (error) {
    console.log(`\n❌ API CALL FAILED: ${error.message}`);
    analysis.failures.push({ stage: 'API Call', error: error.message });
    return null;
  }
}

// Final brutal analysis
function brutallAnalyze() {
  console.log('\n' + '='.repeat(80));
  console.log('💀 BRUTAL HONEST VERDICT');
  console.log('='.repeat(80));
  
  // Question 1: Are ALL visuals truly dynamic?
  console.log('\n❓ ARE ALL VISUALS TRULY DYNAMIC (NO TEMPLATES/FALLBACKS)?');
  if (analysis.fallbacksDetected.length === 0) {
    console.log('   ✅ YES - No fallback code detected in logs');
  } else {
    console.log(`   ❌ NO - ${analysis.fallbacksDetected.length} fallback instances detected`);
    analysis.fallbacksDetected.forEach((fb, idx) => {
      console.log(`      ${idx + 1}. Line ${fb.line}: ${fb.issue}`);
    });
  }
  
  // Question 2: Performance
  console.log('\n❓ IS PERFORMANCE ACCEPTABLE (<15s per step)?');
  if (analysis.timings.avg) {
    if (parseFloat(analysis.timings.avg) <= 15) {
      console.log(`   ✅ YES - Average ${analysis.timings.avg}s (Target: <15s)`);
    } else {
      console.log(`   ⚠️  MARGINAL - Average ${analysis.timings.avg}s (Target: <15s)`);
    }
  } else {
    console.log('   ❌ NO DATA - Could not measure generation times');
  }
  
  // Question 3: Architecture limitations
  console.log('\n❓ WHAT ARE THE ARCHITECTURE LIMITATIONS?');
  console.log('   📌 Current limitations:');
  console.log('      1. Single LLM call per step - no parallelization');
  console.log('      2. No caching of successful generations');
  console.log('      3. SVG-only format - no other visualization types');
  console.log('      4. No quality validation - trust LLM completely');
  console.log('      5. Simple retry (2 attempts) - could be smarter');
  console.log('      6. No progressive rendering - waits for complete SVG');
  
  // Question 4: Is everything working as designed?
  console.log('\n❓ IS EVERYTHING WORKING AS DESIGNED?');
  const hasFailures = analysis.failures.length > 0;
  const hasFallbacks = analysis.fallbacksDetected.length > 0;
  const hasGoodTiming = analysis.timings.avg && parseFloat(analysis.timings.avg) <= 20;
  
  if (!hasFailures && !hasFallbacks && hasGoodTiming) {
    console.log('   ✅ YES - System working as designed');
  } else {
    console.log('   ❌ NO - Issues detected:');
    if (hasFailures) console.log(`      - ${analysis.failures.length} failures`);
    if (hasFallbacks) console.log(`      - ${analysis.fallbacksDetected.length} fallbacks`);
    if (!hasGoodTiming) console.log('      - Performance below target');
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL STATISTICS');
  console.log('='.repeat(80));
  console.log(`   Total steps: ${analysis.totalSteps}`);
  console.log(`   Fallbacks detected: ${analysis.fallbacksDetected.length}`);
  console.log(`   Failures: ${analysis.failures.length}`);
  console.log(`   Avg generation time: ${analysis.timings.avg || 'N/A'}s`);
  console.log(`   Generations completed: ${analysis.timings.count || 0}`);
  
  console.log('\n' + '='.repeat(80));
  
  // Verdict
  if (analysis.fallbacksDetected.length === 0 && analysis.failures.length === 0) {
    console.log('✅ VERDICT: TRUE DYNAMIC GENERATION ACHIEVED');
  } else {
    console.log('❌ VERDICT: STILL USING FALLBACKS OR HAS FAILURES');
  }
  console.log('='.repeat(80) + '\n');
}

// Main execution
async function main() {
  console.log('\n📝 Test will:');
  console.log('   1. Make API call to generate lecture');
  console.log('   2. Wait for visual generation');
  console.log('   3. Analyze backend logs for fallbacks');
  console.log('   4. Provide brutal honest verdict');
  
  // Make API call
  await testAPICall();
  
  // Analyze logs
  analyzeLogs();
  
  // Final analysis
  brutallAnalyze();
}

// Run
main().catch(error => {
  console.error('\n💥 TEST SCRIPT FAILED:', error);
  process.exit(1);
});
