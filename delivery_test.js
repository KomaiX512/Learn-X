const io = require('socket.io-client');
const axios = require('axios');

console.log('\n=== DELIVERY PIPELINE TEST ===\n');

const sessionId = `delivery-test-${Date.now()}`;
const query = 'teach me arrays';

// Connect to WebSocket with keep-alive
const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10
});

let planReceived = false;
let stepsReceived = [];
let startTime = Date.now();
let connectionAlive = true;

// Keep connection alive
const keepAlive = setInterval(() => {
  if (connectionAlive) {
    socket.emit('ping');
  }
}, 10000);

socket.on('connect', () => {
  console.log('✅ WebSocket connected');
  connectionAlive = true;
  socket.emit('join', { sessionId });
  console.log(`✅ Joined session: ${sessionId}`);
});

socket.on('disconnect', (reason) => {
  console.log(`⚠️  WebSocket disconnected: ${reason}`);
  connectionAlive = false;
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
  connectionAlive = true;
  socket.emit('join', { sessionId });
});

socket.on('pong', () => {
  console.log('💓 Keep-alive pong received');
});

socket.on('rendered', (data) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  if (data.type === 'plan') {
    planReceived = true;
    console.log(`\n📋 PLAN RECEIVED at ${elapsed}s:`);
    console.log(`   Title: ${data.plan.title}`);
    console.log(`   Steps: ${data.plan.toc.length}`);
  } else if (data.type === 'chunk' && data.chunk) {
    const stepId = data.chunk.stepId || data.step?.id;
    const actionCount = data.chunk.actions?.length || 0;
    
    if (stepId && !stepsReceived.includes(stepId)) {
      stepsReceived.push(stepId);
      
      console.log(`\n🎬 STEP ${stepId} DELIVERED at ${elapsed}s:`);
      console.log(`   Actions: ${actionCount}`);
      console.log(`   Step Title: ${data.step?.tag || 'N/A'}`);
      
      // Send acknowledgment
      socket.emit('step-received', { sessionId, stepId });
      console.log(`   ✅ Acknowledged step ${stepId}`);
      
      // Analyze content quality
      if (data.chunk.actions) {
        const labels = data.chunk.actions.filter(a => 
          a.op === 'drawLabel' || a.op === 'drawTitle'
        ).length;
        const visuals = data.chunk.actions.filter(a => 
          !['drawLabel', 'drawTitle', 'clear', 'delay'].includes(a.op)
        ).length;
        
        console.log(`   Content: ${visuals} visuals, ${labels} labels`);
        console.log(`   Quality: ${visuals > 0 ? '✅ Rich' : '❌ Poor'}`);
      }
    }
    
    // Check completion
    if (stepsReceived.length === 5) {
      console.log('\n' + '='.repeat(50));
      console.log('🎉 SUCCESS: ALL 5 STEPS DELIVERED!');
      console.log(`⏱️  Total delivery time: ${elapsed}s`);
      console.log('='.repeat(50));
      
      // Final summary
      console.log('\n📊 DELIVERY SUMMARY:');
      console.log(`   Connection: ${connectionAlive ? '✅ ALIVE' : '❌ DEAD'}`);
      console.log(`   Plan received: ${planReceived ? 'YES' : 'NO'}`);
      console.log(`   Steps delivered: ${stepsReceived.sort().join(', ')}`);
      console.log(`   Delivery time: ${elapsed}s`);
      console.log(`   Status: COMPLETE ✅`);
      
      clearInterval(keepAlive);
      setTimeout(() => {
        console.log('\n✅ TEST PASSED - Full delivery pipeline working!');
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
    startTime = Date.now(); // Reset timer after request
  } catch (error) {
    console.error('❌ API request failed:', error.message);
    clearInterval(keepAlive);
    process.exit(1);
  }
}, 1000);

// Timeout after 45 seconds (reduced from 60)
setTimeout(() => {
  clearInterval(keepAlive);
  console.error('\n❌ TIMEOUT: Delivery did not complete within 45 seconds');
  console.log(`   Steps delivered: ${stepsReceived.sort().join(', ') || 'NONE'}`);
  console.log(`   Connection: ${connectionAlive ? 'ALIVE' : 'DEAD'}`);
  process.exit(1);
}, 45000);
