const io = require('socket.io-client');
const axios = require('axios');

console.log('\n=== COMPLETE END-TO-END TEST ===\n');

const sessionId = `test-complete-${Date.now()}`;
const query = 'teach me fibonacci sequence';

// Connect to WebSocket
const socket = io('http://localhost:3001', {
  transports: ['websocket']
});

let planReceived = false;
let stepsReceived = [];
let startTime = Date.now();

socket.on('connect', () => {
  console.log('✅ WebSocket connected');
  socket.emit('join', { sessionId });
  console.log(`✅ Joined session: ${sessionId}`);
});

socket.on('rendered', (data) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  if (data.type === 'plan') {
    planReceived = true;
    console.log(`\n📋 PLAN RECEIVED at ${elapsed}s:`);
    console.log(`   Title: ${data.plan.title}`);
    console.log(`   Steps: ${data.plan.toc.length}`);
  } else if (data.type === 'chunk') {
    const stepId = data.chunk.stepId;
    const actionCount = data.chunk.actions?.length || 0;
    stepsReceived.push(stepId);
    
    console.log(`\n🎬 STEP ${stepId} RECEIVED at ${elapsed}s:`);
    console.log(`   Actions: ${actionCount}`);
    
    // Analyze action types
    const actionTypes = {};
    if (data.chunk.actions) {
      data.chunk.actions.forEach(action => {
        actionTypes[action.op] = (actionTypes[action.op] || 0) + 1;
      });
    }
    
    console.log('   Action breakdown:');
    Object.entries(actionTypes).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count}`);
    });
    
    // Check for labels
    const labels = data.chunk.actions?.filter(a => 
      a.op === 'drawLabel' || a.op === 'drawTitle'
    ) || [];
    console.log(`   Labels/Titles: ${labels.length}`);
    if (labels.length > 0 && labels.length <= 3) {
      labels.forEach(l => {
        console.log(`     "${l.text?.substring(0, 50)}..."`);
      });
    }
    
    // Check if all steps received
    if (stepsReceived.length === 5) {
      console.log('\n' + '='.repeat(50));
      console.log('✅ ALL 5 STEPS RECEIVED!');
      console.log(`⏱️  Total time: ${elapsed}s`);
      console.log('='.repeat(50));
      
      // Summary
      console.log('\n📊 SUMMARY:');
      console.log(`   Plan received: ${planReceived ? 'YES' : 'NO'}`);
      console.log(`   Steps received: ${stepsReceived.sort().join(', ')}`);
      console.log(`   WebSocket delivery: SUCCESS`);
      
      setTimeout(() => {
        console.log('\n✅ TEST COMPLETE - All content delivered to frontend!');
        process.exit(0);
      }, 2000);
    }
  }
});

socket.on('status', (data) => {
  console.log(`📡 Status: ${data.message || data.type}`);
});

socket.on('progress', (data) => {
  console.log(`⚙️  Progress: Step ${data.stepId} - ${data.status}`);
});

socket.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

// Make the API request
setTimeout(async () => {
  console.log(`\n🚀 Sending query: "${query}"`);
  console.log(`   Session: ${sessionId}\n`);
  
  try {
    const response = await axios.post('http://localhost:3001/api/query', {
      query,
      sessionId
    });
    console.log('✅ API request sent successfully');
  } catch (error) {
    console.error('❌ API request failed:', error.message);
    process.exit(1);
  }
}, 1000);

// Timeout after 60 seconds
setTimeout(() => {
  console.error('\n❌ TIMEOUT: Test did not complete within 60 seconds');
  console.log(`   Steps received: ${stepsReceived.sort().join(', ') || 'NONE'}`);
  process.exit(1);
}, 60000);
