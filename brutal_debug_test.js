#!/usr/bin/env node

/**
 * BRUTAL HONEST DEBUG TEST
 * This will test if the system ACTUALLY works end-to-end
 */

const axios = require('axios');
const io = require('socket.io-client');
const fs = require('fs');

const API_BASE = 'http://localhost:3001';
const SOCKET_URL = 'http://localhost:3001';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`${colors[color]}[${timestamp}] ${msg}${colors.reset}`);
}

async function brutalTest() {
  log('=== BRUTAL HONEST DEBUG TEST STARTING ===', 'bright');
  
  // Test query
  const query = 'Teach me about gravity and Newton laws with equations';
  const sessionId = `brutal-test-${Date.now()}`;
  
  log(`Testing with query: "${query}"`, 'cyan');
  log(`Session ID: ${sessionId}`, 'cyan');
  
  // Set up socket connection FIRST
  const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: false
  });
  
  let connected = false;
  let planReceived = false;
  let stepsReceived = [];
  let actionsReceived = [];
  let errors = [];
  
  // Promise to wait for connection
  const connectionPromise = new Promise((resolve) => {
    socket.on('connect', () => {
      log('✓ Socket connected', 'green');
      connected = true;
      socket.emit('join', { sessionId: sessionId });
      log(`→ Joined session: ${sessionId}`, 'blue');
      resolve();
    });
  });
  
  socket.on('connect_error', (err) => {
    log(`✗ Socket connection error: ${err.message}`, 'red');
    errors.push(`Socket error: ${err.message}`);
  });
  
  socket.on('error', (err) => {
    log(`✗ Socket error: ${err}`, 'red');
    errors.push(`Socket error: ${err}`);
  });
  
  socket.on('rendered', (data) => {
    log('=== RENDERED EVENT RECEIVED ===', 'bright');
    
    // Log raw data
    console.log('Raw data:', JSON.stringify(data, null, 2));
    
    if (data.plan) {
      planReceived = true;
      log(`✓ PLAN: ${data.plan.title}`, 'green');
      log(`  Subtitle: ${data.plan.subtitle}`, 'cyan');
      if (data.plan.toc) {
        log(`  TOC Items: ${data.plan.toc.length}`, 'cyan');
        data.plan.toc.forEach(item => {
          log(`    - Minute ${item.minute}: ${item.title}`, 'blue');
        });
      }
    }
    
    if (data.step) {
      stepsReceived.push(data.step);
      log(`✓ STEP ${data.step.id}: ${data.step.desc}`, 'yellow');
      log(`  Tag: ${data.step.tag}, Compiler: ${data.step.compiler}`, 'cyan');
    }
    
    if (data.actions && Array.isArray(data.actions)) {
      actionsReceived.push(...data.actions);
      log(`✓ ACTIONS: ${data.actions.length} actions`, 'green');
      
      // Group actions by type
      const actionTypes = {};
      data.actions.forEach(action => {
        actionTypes[action.op] = (actionTypes[action.op] || 0) + 1;
      });
      
      Object.entries(actionTypes).forEach(([op, count]) => {
        log(`    ${op}: ${count}`, 'magenta');
      });
      
      // Check for specific action details
      data.actions.forEach((action, idx) => {
        if (action.op === 'drawTitle' && action.text) {
          log(`    [${idx}] Title: "${action.text}"`, 'blue');
        }
        if (action.op === 'drawMathLabel' && action.tex) {
          log(`    [${idx}] Math: "${action.tex}"`, 'blue');
        }
        if (action.op === 'drawLabel' && action.text) {
          log(`    [${idx}] Label: "${action.text}"`, 'blue');
        }
      });
    }
    
    if (data.stepId !== undefined) {
      log(`  Step ID in chunk: ${data.stepId}`, 'cyan');
    }
  });
  
  // Wait for socket connection
  await connectionPromise;
  
  // Now send the query
  log('→ Sending query to backend...', 'yellow');
  
  try {
    const response = await axios.post(`${API_BASE}/api/query`, {
      query: query,
      sessionId: sessionId
    });
    
    log(`✓ Query sent successfully, response: ${JSON.stringify(response.data)}`, 'green');
  } catch (error) {
    log(`✗ Failed to send query: ${error.message}`, 'red');
    errors.push(`Query error: ${error.message}`);
  }
  
  // Wait for events
  log('⏳ Waiting 30 seconds for all events...', 'yellow');
  
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Disconnect socket
  socket.disconnect();
  
  // BRUTAL HONEST RESULTS
  log('\n=== BRUTAL HONEST RESULTS ===', 'bright');
  
  log(`Connected to socket: ${connected ? '✓ YES' : '✗ NO'}`, connected ? 'green' : 'red');
  log(`Plan received: ${planReceived ? '✓ YES' : '✗ NO'}`, planReceived ? 'green' : 'red');
  log(`Steps received: ${stepsReceived.length}`, stepsReceived.length > 0 ? 'green' : 'red');
  log(`Total actions: ${actionsReceived.length}`, actionsReceived.length > 0 ? 'green' : 'red');
  log(`Errors: ${errors.length}`, errors.length === 0 ? 'green' : 'red');
  
  if (stepsReceived.length > 0) {
    log('\nSteps delivered:', 'cyan');
    stepsReceived.forEach(step => {
      log(`  Step ${step.id}: ${step.desc}`, 'blue');
    });
  } else {
    log('✗ NO STEPS WERE DELIVERED!', 'red');
  }
  
  if (actionsReceived.length > 0) {
    const actionSummary = {};
    actionsReceived.forEach(a => {
      actionSummary[a.op] = (actionSummary[a.op] || 0) + 1;
    });
    
    log('\nAction summary:', 'cyan');
    Object.entries(actionSummary).forEach(([op, count]) => {
      log(`  ${op}: ${count}`, 'blue');
    });
  } else {
    log('✗ NO ACTIONS WERE RENDERED!', 'red');
  }
  
  if (errors.length > 0) {
    log('\nErrors encountered:', 'red');
    errors.forEach(err => log(`  - ${err}`, 'red'));
  }
  
  // FINAL VERDICT
  const success = connected && planReceived && stepsReceived.length >= 3 && actionsReceived.length > 0;
  
  if (success) {
    log('\n✅ SUCCESS: System is working! Content is being delivered and rendered!', 'green');
  } else {
    log('\n❌ FAILURE: System is NOT working properly!', 'red');
    log('Issues:', 'red');
    if (!connected) log('  - Socket connection failed', 'red');
    if (!planReceived) log('  - No plan was generated', 'red');
    if (stepsReceived.length < 3) log(`  - Only ${stepsReceived.length} steps delivered (expected at least 3)`, 'red');
    if (actionsReceived.length === 0) log('  - No rendering actions were generated', 'red');
  }
  
  // Check backend log
  log('\n=== CHECKING BACKEND LOGS ===', 'bright');
  try {
    const backendLog = fs.readFileSync('/tmp/backend.log', 'utf8');
    const lines = backendLog.split('\n').slice(-50); // Last 50 lines
    
    // Look for important patterns
    const hasGeminiCalls = lines.some(l => l.includes('Gemini'));
    const hasPlannerActivity = lines.some(l => l.includes('[planner]') || l.includes('[plan]'));
    const hasCodegenActivity = lines.some(l => l.includes('[codegen]') || l.includes('[gen]'));
    const hasErrors = lines.some(l => l.includes('error') || l.includes('Error'));
    
    log(`Gemini API calls: ${hasGeminiCalls ? '✓' : '✗'}`, hasGeminiCalls ? 'green' : 'red');
    log(`Planner activity: ${hasPlannerActivity ? '✓' : '✗'}`, hasPlannerActivity ? 'green' : 'red');
    log(`Codegen activity: ${hasCodegenActivity ? '✓' : '✗'}`, hasCodegenActivity ? 'green' : 'red');
    log(`Backend errors: ${hasErrors ? '✗ YES' : '✓ NO'}`, hasErrors ? 'red' : 'green');
    
    if (hasErrors) {
      log('Backend errors found:', 'red');
      lines.filter(l => l.includes('error') || l.includes('Error')).forEach(l => {
        log(`  ${l}`, 'yellow');
      });
    }
  } catch (err) {
    log('Could not read backend log', 'yellow');
  }
  
  process.exit(success ? 0 : 1);
}

// Run the brutal test
brutalTest().catch(err => {
  log(`FATAL ERROR: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
