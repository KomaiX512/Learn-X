#!/usr/bin/env node

const io = require('socket.io-client');

const BACKEND_URL = 'http://localhost:3001';

// Open browser to see visual output
console.log('🌐 Open your browser to: http://localhost:5174');
console.log('   Enter this query: "What is a sine wave?"');
console.log('');

// Connect to monitor events
const socket = io(BACKEND_URL, { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('✅ Connected to backend WebSocket for monitoring');
});

let stepCount = 0;
const results = [];

socket.on('rendered', (data) => {
  stepCount++;
  console.log(`\n🎨 STEP ${stepCount} RENDERED`);
  console.log('=' .repeat(50));
  
  if (data.targetSession) {
    console.log('Session:', data.targetSession);
  }
  
  if (data.step) {
    console.log('📌 Step Details:');
    console.log(`   ID: ${data.step.id}`);
    console.log(`   Tag: ${data.step.tag}`);
    console.log(`   Complexity: ${data.step.complexity}/5`);
    console.log(`   Description: ${data.step.desc.slice(0, 100)}...`);
  }
  
  if (data.actions) {
    console.log(`🎬 Actions: ${data.actions.length} total`);
    
    // Check for fallback
    const hasFallback = data.actions.some(a => 
      a.op === 'drawLabel' && 
      a.text && 
      a.text.includes('Content generation in progress')
    );
    
    if (hasFallback) {
      console.log('   ⚠️  FALLBACK DETECTED - Generation failed!');
    }
    
    // Analyze action types
    const actionTypes = {};
    let hasAnimations = false;
    let hasMath = false;
    
    data.actions.forEach(action => {
      actionTypes[action.op] = (actionTypes[action.op] || 0) + 1;
      if (['orbit', 'wave', 'particle', 'arrow', 'field'].includes(action.op)) {
        hasAnimations = true;
      }
      if (action.op === 'drawMathLabel') {
        hasMath = true;
      }
    });
    
    console.log('   Action breakdown:');
    Object.entries(actionTypes).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count}`);
    });
    
    console.log('   Features:');
    console.log(`     3B1B Animations: ${hasAnimations ? '✅' : '❌'}`);
    console.log(`     Math notation: ${hasMath ? '✅' : '❌'}`);
    
    // Store result
    results.push({
      step: data.step?.id,
      tag: data.step?.tag,
      complexity: data.step?.complexity,
      actionCount: data.actions.length,
      hasAnimations,
      hasMath,
      hasFallback
    });
  }
  
  // Analyze after 5 steps or timeout
  if (stepCount >= 5) {
    setTimeout(() => analyze(), 2000);
  }
});

function analyze() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL ANALYSIS');
  console.log('='.repeat(60));
  
  console.log(`\n📈 Steps Received: ${results.length}`);
  
  const fallbacks = results.filter(r => r.hasFallback).length;
  const animations = results.filter(r => r.hasAnimations).length;
  const avgActions = results.reduce((sum, r) => sum + r.actionCount, 0) / results.length || 0;
  
  console.log(`\n🎯 Quality Metrics:`);
  console.log(`   Average actions per step: ${avgActions.toFixed(1)}`);
  console.log(`   Steps with animations: ${animations}/${results.length}`);
  console.log(`   Steps with fallbacks: ${fallbacks}/${results.length}`);
  
  console.log(`\n🏷️ Learning Progression:`);
  const expectedTags = ['hook', 'intuition', 'formalism', 'exploration', 'mastery'];
  results.forEach((r, i) => {
    const expected = expectedTags[i];
    const match = r.tag === expected ? '✅' : '❌';
    console.log(`   Step ${i + 1}: [${r.tag}] complexity=${r.complexity} ${match}`);
  });
  
  console.log(`\n🏆 VERDICT:`);
  if (fallbacks > 0) {
    console.log(`   ❌ SYSTEM HAS FALLBACKS (${fallbacks} steps failed generation)`);
    console.log(`   This means LLM responses are not being parsed correctly!`);
  } else if (results.length < 5) {
    console.log(`   ⚠️  NOT ALL STEPS RECEIVED (${results.length}/5)`);
  } else if (avgActions < 15) {
    console.log(`   ⚠️  TOO FEW ACTIONS (avg: ${avgActions.toFixed(1)})`);
  } else {
    console.log(`   ✅ SYSTEM WORKING PERFECTLY!`);
    console.log(`   All ${results.length} steps delivered with rich content!`);
  }
  
  console.log('\n💡 To test visually, go to http://localhost:5174');
  console.log('   and enter a query to see the animated learning journey!');
  console.log('');
}

// Keep connection alive
setInterval(() => {
  socket.emit('ping');
}, 30000);

console.log('🔍 Monitoring all learning sessions...');
console.log('   Waiting for rendered events...');
console.log('   (Test by submitting a query in the browser)');
console.log('');
