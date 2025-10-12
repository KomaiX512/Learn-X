#!/usr/bin/env node

/**
 * PRODUCTION TEST - FIXED
 * Uses correct API flow: POST /api/query → WebSocket join → Listen for results
 */

const io = require('socket.io-client');
const http = require('http');
const fs = require('fs');

const TEST_QUERY = process.argv[2] || "teach me about photosynthesis";
const BACKEND_URL = "http://localhost:8000";

const logFile = fs.createWriteStream('production-test-results.log', { flags: 'w' });
const startTime = Date.now();

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const logMessage = `[${timestamp}] [${elapsed}s] [${level}] ${message}`;
  console.log(logMessage);
  logFile.write(logMessage + '\n');
}

function logSection(title) {
  const line = '='.repeat(70);
  log('');
  log(line);
  log(title);
  log(line);
}

const metrics = {
  planTime: 0,
  stepTimes: [],
  visualCounts: [],
  animationCounts: [],
  stepsReceived: 0,
  failures: [],
  warnings: []
};

logSection('PRODUCTION SYSTEM TEST - FIXED');
log(`Query: "${TEST_QUERY}"`);
log(`Backend: ${BACKEND_URL}`);
log('');

// Step 1: Send HTTP POST to /api/query
log('Step 1: Sending HTTP POST to /api/query...', 'REQUEST');

const postData = JSON.stringify({ query: TEST_QUERY });
const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/query',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode !== 200) {
      log(`❌ HTTP Error: ${res.statusCode}`, 'ERROR');
      log(`Response: ${data}`, 'ERROR');
      process.exit(1);
    }
    
    const response = JSON.parse(data);
    const sessionId = response.sessionId;
    
    log(`✅ Session created: ${sessionId}`, 'REQUEST');
    log('');
    
    // Step 2: Connect WebSocket
    log('Step 2: Connecting WebSocket...', 'NETWORK');
    
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnection: false
    });
    
    socket.on('connect', () => {
      log(`✅ WebSocket connected: ${socket.id}`, 'NETWORK');
      log('');
      
      // Step 3: Join session
      log(`Step 3: Joining session ${sessionId}...`, 'NETWORK');
      socket.emit('join', { sessionId });
    });
    
    socket.on('joined', (data) => {
      log(`✅ Joined session: ${data.sessionId}`, 'NETWORK');
      log('Now listening for results...', 'NETWORK');
      log('');
    });
    
    socket.on('rendered', (data) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (data.type === 'plan') {
        metrics.planTime = parseFloat(elapsed);
        
        logSection(`📋 PLAN RECEIVED (${elapsed}s)`);
        log(`Title: ${data.plan.title}`);
        log(`Subtitle: ${data.plan.subtitle}`);
        log(`Steps: ${data.plan.toc?.length || 0}`);
        log('');
        
        if (data.plan.toc) {
          log('Step Structure:');
          data.plan.toc.forEach((item, i) => {
            log(`  ${i + 1}. ${item.title}`);
          });
        }
        log('');
        
        if (data.plan.toc && data.plan.toc.length !== 3) {
          const warning = `⚠️  Expected 3 steps, got ${data.plan.toc.length}`;
          log(warning, 'WARNING');
          metrics.warnings.push(warning);
        } else {
          log('✅ Correct: 3 steps', 'VALIDATION');
        }
        
      } else if (data.type === 'actions' && data.actions) {
        const stepId = data.stepId || metrics.stepsReceived + 1;
        metrics.stepsReceived++;
        metrics.stepTimes.push(parseFloat(elapsed));
        
        logSection(`📦 STEP ${stepId} RECEIVED (${elapsed}s)`);
        log(`Tag: ${data.step?.tag || 'unknown'}`);
        log(`Total Actions: ${data.actions.length}`);
        log('');
        
        // Analyze
        let svgCount = 0;
        let animationCount = 0;
        
        data.actions.forEach(action => {
          if (action.op === 'customSVG') {
            svgCount++;
            if (action.svgCode && action.svgCode.includes('<animate')) {
              animationCount++;
            }
          }
        });
        
        metrics.visualCounts.push(svgCount);
        metrics.animationCounts.push(animationCount);
        
        log(`SVG Visuals: ${svgCount}`);
        log(`Animations: ${animationCount}`);
        log('');
        
        if (svgCount < 4) {
          const warning = `⚠️  Expected 4 visuals, got ${svgCount}`;
          log(warning, 'WARNING');
          metrics.warnings.push(warning);
        }
        
        if (animationCount < 2) {
          const warning = `⚠️  Expected 2 animations, got ${animationCount}`;
          log(warning, 'WARNING');
          metrics.warnings.push(warning);
        }
        
        if (metrics.stepsReceived === 3) {
          logSection('ALL 3 STEPS RECEIVED');
          setTimeout(() => {
            generateFinalReport();
            socket.disconnect();
            process.exit(0);
          }, 2000);
        }
        
      } else if (data.type === 'error') {
        const error = `❌ ERROR: ${data.message || data.error}`;
        log(error, 'ERROR');
        metrics.failures.push(error);
      }
    });
    
    socket.on('progress', (data) => {
      log(`Progress: ${data.message || ''}`, 'PROGRESS');
    });
    
    socket.on('generation_progress', (data) => {
      log(`Generation: ${data.message || ''}`, 'PROGRESS');
    });
    
    socket.on('connect_error', (err) => {
      log(`❌ Connection error: ${err.message}`, 'ERROR');
      process.exit(1);
    });
    
    // Timeout
    setTimeout(() => {
      log('❌ TIMEOUT: No completion in 3 minutes', 'TIMEOUT');
      generateFinalReport();
      socket.disconnect();
      process.exit(1);
    }, 180000);
  });
});

req.on('error', (e) => {
  log(`❌ Request error: ${e.message}`, 'ERROR');
  log('Is backend running on port 8000?', 'ERROR');
  process.exit(1);
});

req.write(postData);
req.end();

function generateFinalReport() {
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  logSection('FINAL REPORT');
  log('');
  
  log('📊 TIMING:');
  log(`  Total: ${totalTime}s`);
  log(`  Plan: ${metrics.planTime}s`);
  metrics.stepTimes.forEach((t, i) => {
    log(`  Step ${i + 1}: ${t}s`);
  });
  log('');
  
  log('📈 CONTENT:');
  log(`  Steps: ${metrics.stepsReceived}/3`);
  log(`  Visuals: ${metrics.visualCounts.reduce((a, b) => a + b, 0)}`);
  log(`  Animations: ${metrics.animationCounts.reduce((a, b) => a + b, 0)}`);
  log('');
  
  let score = 0;
  if (metrics.stepsReceived === 3) score += 50;
  if (metrics.failures.length === 0) score += 20;
  if (metrics.visualCounts.reduce((a, b) => a + b, 0) >= 12) score += 15;
  if (metrics.animationCounts.reduce((a, b) => a + b, 0) >= 6) score += 15;
  
  log(`📊 SCORE: ${score}/100`);
  log('');
  
  if (score >= 85) {
    log('✅ PRODUCTION READY');
  } else if (score >= 50) {
    log('⚠️  ACCEPTABLE - Has issues');
  } else {
    log('❌ NOT PRODUCTION READY');
  }
  
  logFile.end();
}
