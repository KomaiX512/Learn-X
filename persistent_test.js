#!/usr/bin/env node

const axios = require('axios');
const io = require('socket.io-client');

async function persistentTest() {
  console.log('=== PERSISTENT CONNECTION TEST ===');
  
  const query = 'What is 2+2';
  const sessionId = `persist-${Date.now()}`;
  
  console.log(`Query: "${query}"`);
  console.log(`Session: ${sessionId}`);
  
  // Connect with persistent settings
  const socket = io('http://localhost:3001', {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 60000,
    forceNew: true
  });
  
  let events = [];
  
  // Monitor connection state
  socket.on('connect', () => {
    console.log(`✓ Connected (socket id: ${socket.id})`);
    socket.emit('join', { sessionId });
    console.log(`→ Joining room: ${sessionId}`);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`✗ Disconnected: ${reason}`);
  });
  
  socket.on('connect_error', (error) => {
    console.log(`✗ Connection error: ${error.message}`);
  });
  
  socket.on('joined', (data) => {
    console.log(`✓ Joined room confirmed: ${data.sessionId}`);
  });
  
  // Listen for test event
  socket.on('test', (data) => {
    console.log('✓ Test event received:', data);
  });
  
  // Listen for rendered events (both targeted and broadcast)
  socket.on('rendered', (data) => {
    // Handle broadcast fallback
    if (data.targetSession && data.targetSession !== sessionId) {
      return;
    }
    
    console.log('\n=== RENDERED EVENT RECEIVED ===');
    events.push(data);
    
    if (data.plan) {
      console.log(`✓ Plan: ${data.plan.title}`);
    }
    
    if (data.step) {
      console.log(`✓ Step ${data.step.id}: ${data.step.desc}`);
    }
    
    if (data.actions) {
      console.log(`✓ Actions: ${data.actions.length}`);
    }
  });
  
  // Wait for connection
  await new Promise(resolve => {
    if (socket.connected) {
      resolve();
    } else {
      socket.once('connect', resolve);
    }
  });
  
  // Wait a bit for join to complete
  await new Promise(r => setTimeout(r, 1000));
  
  console.log(`\n→ Sending query...`);
  const res = await axios.post('http://localhost:3001/api/query', {
    query,
    sessionId
  });
  console.log(`✓ Query accepted: ${res.data.sessionId}`);
  
  // Keep checking connection status
  let checkCount = 0;
  const checkInterval = setInterval(() => {
    checkCount++;
    console.log(`[${checkCount}] Connected: ${socket.connected}, Events: ${events.length}`);
    
    if (events.length >= 3 || checkCount > 60) {
      clearInterval(checkInterval);
    }
  }, 2000);
  
  // Wait longer for all events
  console.log('\n⏳ Waiting 60 seconds for events...');
  await new Promise(r => setTimeout(r, 60000));
  
  clearInterval(checkInterval);
  
  // Results
  console.log('\n=== FINAL RESULTS ===');
  console.log(`Final connection state: ${socket.connected ? 'Connected' : 'Disconnected'}`);
  console.log(`Total events received: ${events.length}`);
  
  if (events.length > 0) {
    console.log('\n✅ SUCCESS! Events received:');
    events.forEach((e, i) => {
      console.log(`  ${i+1}. Step ${e.step?.id || '?'}: ${e.actions?.length || 0} actions`);
    });
  } else {
    console.log('\n❌ FAILURE - No events received despite persistent connection');
  }
  
  socket.disconnect();
  process.exit(events.length > 0 ? 0 : 1);
}

persistentTest().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
