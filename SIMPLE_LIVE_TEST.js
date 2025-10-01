#!/usr/bin/env node

/**
 * SIMPLE LIVE TEST - Direct testing without shell complexity
 */

const http = require('http');
const { spawn } = require('child_process');

const SESSION_ID = `test-${Date.now()}`;
const TEST_QUERY = 'teach me about quicksort algorithm';

console.log('============================================');
console.log('🔬 LIVE SYSTEM TEST');
console.log('============================================\n');

console.log(`📋 Configuration:`);
console.log(`  Query: ${TEST_QUERY}`);
console.log(`  Session: ${SESSION_ID}\n`);

// Test if backend is running
function testBackend() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/',
      method: 'GET'
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

// Send query
function sendQuery() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      query: TEST_QUERY,
      sessionId: SESSION_ID
    });
    
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(postData);
    req.end();
  });
}

// Monitor backend logs
function monitorLogs() {
  console.log('⏳ Monitoring backend logs for 30 seconds...\n');
  
  const tail = spawn('tail', ['-f', '/tmp/backend_test_live.log']);
  let buffer = '';
  
  const checks = {
    visualAgent: false,
    stepsEmitted: 0,
    actionsGenerated: 0,
    fallbacks: 0,
    errors: 0
  };
  
  tail.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    
    lines.forEach(line => {
      // Check for visual agent usage
      if (line.includes('visualAgent') && !checks.visualAgent) {
        if (line.includes('visualAgent (GENERIC)')) {
          console.log('✅ Using V1 (Enhanced Narrative Agent)');
        } else if (line.includes('visualAgentV2')) {
          console.log('⚠️  Using V2 (Domain Agent)');
        }
        checks.visualAgent = true;
      }
      
      // Check for step emissions
      if (line.includes('Emitted') && line.includes('step')) {
        checks.stepsEmitted++;
        if (line.includes('FIRST step')) {
          console.log(`📤 Step 1: Emitted IMMEDIATELY`);
        } else {
          const match = line.match(/step (\d+).*?(\d+)ms/);
          if (match) {
            console.log(`📤 Step ${match[1]}: Emitted after ${match[2]}ms`);
          }
        }
      }
      
      // Check for actions generated
      if (line.includes('actions') && line.includes('Generated')) {
        const match = line.match(/(\d+) actions/);
        if (match) {
          const count = parseInt(match[1]);
          checks.actionsGenerated += count;
          if (count >= 50) {
            console.log(`✨ Rich content: ${count} actions`);
          } else if (count >= 30) {
            console.log(`⚠️  Moderate: ${count} actions`);
          } else {
            console.log(`❌ Sparse: ${count} actions`);
          }
        }
      }
      
      // Check for fallbacks
      if ((line.includes('fallback') || line.includes('dummy')) && !line.includes('NO FALLBACK')) {
        checks.fallbacks++;
        console.log(`❌ FALLBACK DETECTED: ${line.substring(0, 80)}`);
      }
      
      // Check for errors
      if ((line.includes('ERROR') || line.includes('FAILED')) && !line.includes('NO FALLBACK')) {
        checks.errors++;
        if (checks.errors <= 3) {
          console.log(`❌ ERROR: ${line.substring(0, 80)}`);
        }
      }
    });
  });
  
  return new Promise((resolve) => {
    setTimeout(() => {
      tail.kill();
      resolve(checks);
    }, 30000);
  });
}

// Main test
async function runTest() {
  try {
    // 1. Check backend
    console.log('🔍 Checking backend status...');
    const isRunning = await testBackend();
    
    if (!isRunning) {
      console.error('❌ Backend not running on port 3001');
      console.error('   Run: cd app/backend && npm run dev');
      process.exit(1);
    }
    
    console.log('✅ Backend is running\n');
    
    // 2. Send query
    console.log('🚀 Sending test query...');
    const result = await sendQuery();
    console.log('✅ Query accepted\n');
    
    // 3. Monitor logs
    const checks = await monitorLogs();
    
    // 4. Analyze results
    console.log('\n============================================');
    console.log('📊 BRUTAL HONEST ANALYSIS');
    console.log('============================================\n');
    
    console.log('1. Visual Agent:');
    console.log(`   ${checks.visualAgent ? '✅' : '❌'} Agent selection logged\n`);
    
    console.log('2. Sequential Delivery:');
    console.log(`   Steps emitted: ${checks.stepsEmitted}/5`);
    if (checks.stepsEmitted >= 5) {
      console.log(`   ✅ All steps delivered\n`);
    } else if (checks.stepsEmitted > 0) {
      console.log(`   ⚠️  Only ${checks.stepsEmitted} steps delivered\n`);
    } else {
      console.log(`   ❌ NO steps emitted\n`);
    }
    
    console.log('3. Content Generation:');
    console.log(`   Total actions: ${checks.actionsGenerated}`);
    const avgActions = checks.stepsEmitted > 0 ? Math.round(checks.actionsGenerated / checks.stepsEmitted) : 0;
    console.log(`   Average per step: ${avgActions}`);
    if (avgActions >= 50) {
      console.log(`   ✅ Rich content (50+ actions/step)\n`);
    } else if (avgActions >= 30) {
      console.log(`   ⚠️  Moderate content (30-49 actions/step)\n`);
    } else {
      console.log(`   ❌ Sparse content (<30 actions/step)\n`);
    }
    
    console.log('4. Fallback Detection:');
    if (checks.fallbacks === 0) {
      console.log(`   ✅ NO FALLBACKS DETECTED\n`);
    } else {
      console.log(`   ❌ FOUND ${checks.fallbacks} FALLBACK REFERENCES\n`);
    }
    
    console.log('5. Error Analysis:');
    if (checks.errors === 0) {
      console.log(`   ✅ NO ERRORS\n`);
    } else {
      console.log(`   ❌ FOUND ${checks.errors} ERRORS\n`);
    }
    
    // Final verdict
    console.log('============================================');
    console.log('🎯 FINAL VERDICT');
    console.log('============================================\n');
    
    const score = (
      (checks.fallbacks === 0 ? 25 : 0) +
      (checks.errors === 0 ? 25 : 10) +
      (checks.stepsEmitted >= 5 ? 25 : checks.stepsEmitted * 5) +
      (avgActions >= 50 ? 25 : avgActions >= 30 ? 15 : 5)
    );
    
    console.log(`Overall Score: ${score}/100`);
    
    if (score >= 90) {
      console.log('✅ EXCELLENT - System working as expected!\n');
    } else if (score >= 70) {
      console.log('⚠️  GOOD - Minor issues found\n');
    } else if (score >= 50) {
      console.log('⚠️  NEEDS WORK - Significant issues\n');
    } else {
      console.log('❌ CRITICAL - Major problems\n');
    }
    
    console.log('============================================\n');
    console.log('Full logs: /tmp/backend_test_live.log\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTest();
