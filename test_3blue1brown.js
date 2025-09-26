#!/usr/bin/env node

const http = require('http');
const io = require('socket.io-client');

// Test configuration
const BACKEND_URL = 'http://localhost:3001';
const TEST_QUERY = 'How does the Fourier transform work?';

console.log('🎯 TESTING 3BLUE1BROWN LEARNING SYSTEM');
console.log('=====================================');
console.log(`Query: "${TEST_QUERY}"`);
console.log('');

// Function to make HTTP request
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test health endpoint
async function testHealth() {
  console.log('📋 Checking backend health...');
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/health',
    method: 'GET'
  };
  
  const health = await makeRequest(options);
  console.log('✅ Backend is healthy:', health.ok);
  console.log('   Environment:', health.env);
  return health.ok;
}

// Send query and monitor response
async function sendQuery() {
  console.log('\n📚 Sending learning query...');
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/query',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const data = {
    query: TEST_QUERY,
    params: {
      style: '3blue1brown',
      depth: 'profound'
    }
  };
  
  const response = await makeRequest(options, data);
  console.log('✅ Query accepted, sessionId:', response.sessionId);
  return response.sessionId;
}

// Monitor socket events
function monitorSocket(sessionId) {
  console.log('\n🔌 Connecting to WebSocket for real-time monitoring...');
  
  const socket = io(BACKEND_URL, {
    transports: ['websocket']
  });
  
  let stepCount = 0;
  const stepsReceived = [];
  const startTime = Date.now();
  
  socket.on('connect', () => {
    console.log('✅ WebSocket connected, joining session:', sessionId);
    socket.emit('join', { sessionId });
  });
  
  socket.on('joined', (data) => {
    console.log('✅ Joined session room:', data.sessionId);
  });
  
  socket.on('test', (data) => {
    console.log('📡 Test event received:', data);
  });
  
  socket.on('rendered', (data) => {
    stepCount++;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n🎨 STEP ${stepCount} RECEIVED [${elapsed}s]`);
    console.log('=====================================');
    
    if (data.step) {
      console.log('📌 Step Details:');
      console.log(`   ID: ${data.step.id}`);
      console.log(`   Tag: ${data.step.tag}`);
      console.log(`   Description: ${data.step.desc}`);
      console.log(`   Complexity: ${data.step.complexity}/5`);
    }
    
    if (data.plan) {
      console.log('📖 Plan Info:');
      console.log(`   Title: ${data.plan.title}`);
      console.log(`   Hook: ${data.plan.subtitle}`);
      if (data.plan.toc && stepCount === 1) {
        console.log('   Table of Contents:');
        data.plan.toc.forEach(item => {
          console.log(`     ${item.minute}min: ${item.title} - ${item.summary}`);
        });
      }
    }
    
    if (data.actions) {
      console.log(`🎬 Actions: ${data.actions.length} total`);
      
      // Analyze action types
      const actionTypes = {};
      data.actions.forEach(action => {
        actionTypes[action.op] = (actionTypes[action.op] || 0) + 1;
      });
      
      console.log('   Action breakdown:');
      Object.entries(actionTypes).forEach(([type, count]) => {
        console.log(`     - ${type}: ${count}`);
      });
      
      // Check for special actions
      const hasTitle = data.actions.some(a => a.op === 'drawTitle' || (a.op === 'drawLabel' && a.isTitle));
      const hasAnimations = data.actions.some(a => ['orbit', 'wave', 'particle', 'arrow', 'field'].includes(a.op));
      const hasMath = data.actions.some(a => a.op === 'drawMathLabel');
      
      console.log('   Features:');
      console.log(`     ✅ Title/Headers: ${hasTitle}`);
      console.log(`     ✅ 3B1B Animations: ${hasAnimations}`);
      console.log(`     ✅ Mathematical notation: ${hasMath}`);
      
      // Store for analysis
      stepsReceived.push({
        step: data.step,
        actionCount: data.actions.length,
        actionTypes,
        hasTitle,
        hasAnimations,
        hasMath
      });
    }
    
    // Check if all 5 steps received
    if (stepCount === 5) {
      console.log('\n🎉 ALL 5 STEPS RECEIVED!');
      console.log('=====================================');
      analyzeResults(stepsReceived);
      socket.disconnect();
      process.exit(0);
    }
  });
  
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });
  
  // Timeout after 2 minutes
  setTimeout(() => {
    console.log('\n⏱️  TIMEOUT: Test took too long (2 minutes)');
    analyzeResults(stepsReceived);
    socket.disconnect();
    process.exit(1);
  }, 120000);
}

// Analyze results
function analyzeResults(steps) {
  console.log('\n📊 FINAL ANALYSIS');
  console.log('=====================================');
  
  console.log(`Steps received: ${steps.length}/5`);
  
  if (steps.length > 0) {
    // Check progression
    console.log('\n🎯 Learning Progression:');
    const expectedTags = ['hook', 'intuition', 'formalism', 'exploration', 'mastery'];
    steps.forEach((s, i) => {
      const tag = s.step?.tag || 'unknown';
      const complexity = s.step?.complexity || 0;
      const expected = expectedTags[i] || 'unknown';
      const tagMatch = tag === expected ? '✅' : '❌';
      const complexityMatch = complexity === (i + 1) ? '✅' : '❌';
      
      console.log(`   Step ${i + 1}: [${tag}] complexity=${complexity}`);
      console.log(`     Tag match: ${tagMatch} (expected: ${expected})`);
      console.log(`     Complexity match: ${complexityMatch} (expected: ${i + 1})`);
      console.log(`     Actions: ${s.actionCount}, Has animations: ${s.hasAnimations}`);
    });
    
    // Check for quality
    console.log('\n🌟 Quality Check:');
    const totalActions = steps.reduce((sum, s) => sum + s.actionCount, 0);
    const avgActions = (totalActions / steps.length).toFixed(1);
    const allHaveAnimations = steps.every(s => s.hasAnimations);
    const progressiveComplexity = steps.every((s, i) => !s.step || s.step.complexity === (i + 1));
    
    console.log(`   Total actions: ${totalActions}`);
    console.log(`   Average actions per step: ${avgActions}`);
    console.log(`   All steps have animations: ${allHaveAnimations ? '✅' : '❌'}`);
    console.log(`   Progressive complexity: ${progressiveComplexity ? '✅' : '❌'}`);
    
    // Final verdict
    console.log('\n🏆 VERDICT:');
    const minActionsPerStep = 15;
    const hasEnoughActions = avgActions >= minActionsPerStep;
    const isComplete = steps.length === 5;
    
    if (isComplete && hasEnoughActions && allHaveAnimations && progressiveComplexity) {
      console.log('   ✅✅✅ SYSTEM WORKING PERFECTLY! ✅✅✅');
      console.log('   3Blue1Brown-style learning journey successfully delivered!');
    } else {
      console.log('   ⚠️  ISSUES DETECTED:');
      if (!isComplete) console.log('     - Not all 5 steps received');
      if (!hasEnoughActions) console.log(`     - Too few actions (avg: ${avgActions} < ${minActionsPerStep})`);
      if (!allHaveAnimations) console.log('     - Some steps missing animations');
      if (!progressiveComplexity) console.log('     - Complexity not progressive');
    }
  } else {
    console.log('   ❌ NO STEPS RECEIVED - SYSTEM FAILURE');
  }
}

// Main test flow
async function runTest() {
  try {
    // Check health
    const healthy = await testHealth();
    if (!healthy) {
      console.error('❌ Backend is not healthy!');
      process.exit(1);
    }
    
    // Send query
    const sessionId = await sendQuery();
    
    // Monitor socket for responses
    monitorSocket(sessionId);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest();
