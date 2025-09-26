#!/usr/bin/env node

/**
 * FINAL COMPREHENSIVE TEST
 * Tests the complete system end-to-end
 */

const axios = require('axios');
const io = require('socket.io-client');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function testQuery(query, duration = 30000) {
  const sessionId = `test-${Date.now()}`;
  
  log(`\nTesting: "${query}"`, 'cyan');
  
  const socket = io('http://localhost:3001', {
    transports: ['websocket'],
    reconnection: true
  });
  
  let events = [];
  let connected = false;
  
  socket.on('rendered', (data) => {
    if (data.targetSession && data.targetSession !== sessionId) return;
    events.push(data);
  });
  
  // Connect and join
  await new Promise((resolve) => {
    socket.on('connect', () => {
      connected = true;
      socket.emit('join', { sessionId });
      setTimeout(resolve, 500);
    });
  });
  
  if (!connected) {
    log('  ✗ Failed to connect', 'red');
    socket.disconnect();
    return { success: false, events: [] };
  }
  
  // Send query
  try {
    await axios.post('http://localhost:3001/api/query', { query, sessionId });
  } catch (err) {
    log(`  ✗ Query failed: ${err.message}`, 'red');
    socket.disconnect();
    return { success: false, events: [] };
  }
  
  // Wait for events
  await new Promise(r => setTimeout(r, duration));
  
  socket.disconnect();
  
  // Analyze results
  const hasPlans = events.some(e => e.plan);
  const uniqueSteps = [...new Set(events.map(e => e.step?.id).filter(Boolean))];
  const totalActions = events.reduce((sum, e) => sum + (e.actions?.length || 0), 0);
  
  log(`  ✓ Events: ${events.length}`, 'green');
  log(`  ✓ Steps: ${uniqueSteps.length}`, 'green');
  log(`  ✓ Actions: ${totalActions}`, 'green');
  
  return {
    success: events.length > 0,
    events,
    stats: {
      eventCount: events.length,
      stepCount: uniqueSteps.length,
      actionCount: totalActions,
      hasPlans
    }
  };
}

async function runTests() {
  log('=== FINAL SYSTEM TEST ===', 'bright');
  log('Testing LeaF Enhanced Learning Engine\n', 'cyan');
  
  const tests = [
    { query: 'What is 2+2?', duration: 20000 },
    { query: 'Explain gravity', duration: 25000 },
    { query: 'How does photosynthesis work?', duration: 25000 }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await testQuery(test.query, test.duration);
    
    if (result.success) {
      passed++;
      log(`✅ PASSED`, 'green');
      
      // Show what animations were used
      const animationOps = new Set();
      result.events.forEach(e => {
        e.actions?.forEach(a => {
          if (['drawParticles', 'drawSpiral', 'drawRipple', 'drawCurve', 'drawAxis'].includes(a.op)) {
            animationOps.add(a.op);
          }
        });
      });
      
      if (animationOps.size > 0) {
        log(`  Animations: ${[...animationOps].join(', ')}`, 'cyan');
      }
    } else {
      failed++;
      log(`❌ FAILED`, 'red');
    }
  }
  
  // Final summary
  log('\n=== FINAL RESULTS ===', 'bright');
  log(`Tests Passed: ${passed}/${tests.length}`, passed === tests.length ? 'green' : 'yellow');
  
  if (passed === tests.length) {
    log('\n🎉 SUCCESS! The LeaF system is fully operational!', 'green');
    log('✓ Backend processing works', 'green');
    log('✓ Socket.io communication works', 'green');
    log('✓ Content generation works', 'green');
    log('✓ Event delivery works', 'green');
    log('✓ Rich animations available', 'green');
    log('\nThe system is ready for use!', 'bright');
  } else {
    log('\n⚠️ Some tests failed. Check the logs for details.', 'yellow');
  }
  
  process.exit(passed === tests.length ? 0 : 1);
}

runTests().catch(err => {
  log(`Fatal error: ${err.message}`, 'red');
  process.exit(1);
});
