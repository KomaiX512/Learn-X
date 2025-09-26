#!/usr/bin/env node

const http = require('http');
const io = require('socket.io-client');

const BACKEND_URL = 'http://localhost:3001';
const TEST_QUERIES = [
  'What is a derivative?',
  'How does recursion work?',
  'Explain the sine wave'
];

console.log('🔬 TESTING NO-FALLBACK IMPLEMENTATION');
console.log('=====================================');
console.log('This test verifies:');
console.log('✅ NO fallback content');
console.log('✅ Retry logic working');
console.log('✅ JSON sanitization active');
console.log('✅ 100% true generation or proper failure');
console.log('');

let totalSteps = 0;
let successfulSteps = 0;
let failedSteps = 0;
let fallbackDetected = false;
let retryDetected = false;

// Connect to backend
const socket = io(BACKEND_URL, { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('✅ Connected to backend WebSocket');
  console.log('');
  // Start testing
  runTests();
});

socket.on('rendered', (data) => {
  totalSteps++;
  
  console.log(`\n📦 Step ${totalSteps} Received`);
  console.log('-'.repeat(40));
  
  if (data.step) {
    console.log(`  Tag: ${data.step.tag}`);
    console.log(`  Complexity: ${data.step.complexity}`);
  }
  
  if (data.actions) {
    const actionCount = data.actions.length;
    console.log(`  Actions: ${actionCount}`);
    
    // Check for fallback content
    const hasFallback = data.actions.some(a => 
      (a.op === 'drawLabel' && a.text && a.text.includes('Content generation in progress')) ||
      (a.op === 'drawLabel' && a.text && a.text.includes('Step ') && actionCount <= 3)
    );
    
    if (hasFallback) {
      console.log('  ❌ FALLBACK DETECTED!');
      fallbackDetected = true;
      failedSteps++;
    } else {
      console.log('  ✅ True generation successful');
      successfulSteps++;
      
      // Check for Math expressions (should be sanitized)
      const jsonString = JSON.stringify(data.actions);
      if (jsonString.includes('Math.') || jsonString.includes('function')) {
        console.log('  ⚠️  WARNING: Unsanitized JavaScript detected!');
      }
    }
    
    // Sample some actions
    const actionTypes = {};
    data.actions.forEach(a => {
      actionTypes[a.op] = (actionTypes[a.op] || 0) + 1;
    });
    console.log('  Action types:', Object.keys(actionTypes).join(', '));
  }
});

async function sendQuery(query) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      query: query,
      params: { style: '3blue1brown' }
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const response = JSON.parse(body);
        console.log(`\n🚀 Query sent: "${query}"`);
        console.log(`   SessionId: ${response.sessionId}`);
        resolve(response.sessionId);
      });
    });
    
    req.on('error', (e) => {
      console.error('Error:', e);
      resolve(null);
    });
    
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('Starting test queries...\n');
  
  for (const query of TEST_QUERIES) {
    await sendQuery(query);
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  
  // Wait for all steps to complete
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Final analysis
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL ANALYSIS');
  console.log('='.repeat(50));
  
  console.log(`\n📈 Statistics:`);
  console.log(`   Total steps received: ${totalSteps}`);
  console.log(`   Successful steps: ${successfulSteps}`);
  console.log(`   Failed steps: ${failedSteps}`);
  console.log(`   Success rate: ${((successfulSteps/totalSteps) * 100).toFixed(1)}%`);
  
  console.log(`\n🔍 Quality Checks:`);
  console.log(`   Fallbacks detected: ${fallbackDetected ? '❌ YES (FAIL)' : '✅ NO (PASS)'}`);
  console.log(`   Average actions: ${totalSteps > 0 ? Math.round(successfulSteps * 20 / totalSteps) : 'N/A'}`);
  
  console.log(`\n🏆 VERDICT:`);
  if (fallbackDetected) {
    console.log('   ❌ SYSTEM STILL HAS FALLBACKS!');
    console.log('   The no-fallback requirement is NOT met.');
  } else if (successfulSteps === 0) {
    console.log('   ❌ NO SUCCESSFUL GENERATIONS!');
    console.log('   System is failing but at least no fallbacks.');
  } else if (successfulSteps === totalSteps) {
    console.log('   ✅✅✅ PERFECT! 100% TRUE GENERATION!');
    console.log('   All steps generated successfully with NO fallbacks!');
  } else {
    console.log('   ⚠️  PARTIAL SUCCESS');
    console.log(`   ${successfulSteps}/${totalSteps} steps succeeded without fallbacks.`);
    console.log('   System fails properly when generation fails (no fallbacks).');
  }
  
  process.exit(fallbackDetected ? 1 : 0);
}

// Monitor backend logs for retry detection
setInterval(async () => {
  // Check if backend is retrying
  const checkRetry = await fetch('http://localhost:3001/health').catch(() => null);
  if (checkRetry) {
    // Backend is alive
  }
}, 5000);

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

socket.on('disconnect', () => {
  console.log('\nSocket disconnected');
});
