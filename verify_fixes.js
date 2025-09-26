const io = require('socket.io-client');

console.log('🔬 VERIFICATION TEST FOR FIXES');
console.log('==============================');
console.log('Monitoring backend for:');
console.log('1. Retry attempts (up to 3)');
console.log('2. JSON sanitization');
console.log('3. No fallback content');
console.log('');

const socket = io('http://localhost:3001', { transports: ['websocket'] });

let stepCount = 0;
const results = [];

socket.on('connect', () => {
  console.log('✅ Connected to backend');
  console.log('');
  console.log('Waiting for any rendered events...');
  console.log('(Send a query via browser or API)');
  console.log('');
});

socket.on('rendered', (data) => {
  stepCount++;
  console.log(`\n📦 STEP ${stepCount} RECEIVED`);
  console.log('='.repeat(40));
  
  // Check for session targeting (fallback mode)
  if (data.targetSession) {
    console.log('⚠️  Broadcast mode (no room sockets)');
  }
  
  if (data.step) {
    console.log(`Step: ${data.step.id} [${data.step.tag}] complexity=${data.step.complexity}`);
  }
  
  if (data.actions && Array.isArray(data.actions)) {
    const actionCount = data.actions.length;
    console.log(`Actions: ${actionCount}`);
    
    // Check for fallback
    const hasFallback = data.actions.some(a => 
      a.op === 'drawLabel' && 
      a.text && 
      a.text.includes('Content generation in progress')
    );
    
    if (hasFallback) {
      console.log('❌ FALLBACK DETECTED!');
      console.log('   This should NOT happen with our fixes!');
      results.push({ step: stepCount, status: 'FALLBACK' });
    } else if (actionCount < 10) {
      console.log('⚠️  Very few actions (possible issue)');
      results.push({ step: stepCount, status: 'LOW_ACTIONS' });
    } else {
      console.log('✅ SUCCESSFUL GENERATION');
      console.log(`   ${actionCount} actions with no fallback`);
      results.push({ step: stepCount, status: 'SUCCESS', actionCount });
      
      // Check action quality
      const actionTypes = new Set();
      let hasAnimations = false;
      let hasMath = false;
      
      data.actions.forEach(a => {
        actionTypes.add(a.op);
        if (['orbit', 'wave', 'particle', 'arrow', 'field'].includes(a.op)) {
          hasAnimations = true;
        }
        if (a.op === 'drawMathLabel') {
          hasMath = true;
        }
      });
      
      console.log(`   Action types: ${actionTypes.size} unique`);
      console.log(`   Has animations: ${hasAnimations ? '✅' : '❌'}`);
      console.log(`   Has math: ${hasMath ? '✅' : '❌'}`);
      
      // Check for unsanitized JavaScript
      const jsonStr = JSON.stringify(data.actions);
      if (jsonStr.includes('Math.') || jsonStr.includes('function(')) {
        console.log('   ⚠️  WARNING: JavaScript expressions found!');
      } else {
        console.log('   ✅ Clean JSON (no JS expressions)');
      }
    }
    
    // Sample first few actions
    console.log('\nFirst 3 actions:');
    data.actions.slice(0, 3).forEach((a, i) => {
      const preview = JSON.stringify(a).slice(0, 100);
      console.log(`   ${i+1}. ${preview}...`);
    });
  }
  
  // After 5 steps, summarize
  if (stepCount >= 5) {
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY AFTER 5 STEPS');
    console.log('='.repeat(50));
    
    const successes = results.filter(r => r.status === 'SUCCESS').length;
    const fallbacks = results.filter(r => r.status === 'FALLBACK').length;
    const lowActions = results.filter(r => r.status === 'LOW_ACTIONS').length;
    
    console.log(`Success: ${successes}/5`);
    console.log(`Fallbacks: ${fallbacks}/5`);
    console.log(`Low actions: ${lowActions}/5`);
    
    if (fallbacks > 0) {
      console.log('\n❌ FIXES NOT WORKING - Fallbacks still present!');
    } else if (successes === 5) {
      console.log('\n✅✅✅ PERFECT - All fixes working!');
    } else {
      console.log('\n⚠️  PARTIAL SUCCESS - Some issues remain');
    }
  }
});

// Send a test query after connection
setTimeout(() => {
  console.log('\n🚀 Sending test query...');
  const http = require('http');
  const data = JSON.stringify({
    query: 'What is a parabola?',
    params: { style: '3blue1brown' }
  });
  
  const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/query',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      const response = JSON.parse(body);
      console.log(`   SessionId: ${response.sessionId}`);
      // Join the session to receive events
      socket.emit('join', { sessionId: response.sessionId });
    });
  });
  
  req.on('error', console.error);
  req.write(data);
  req.end();
}, 2000);

// Keep alive
setInterval(() => {}, 1000);
