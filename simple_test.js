#!/usr/bin/env node

/**
 * SIMPLE TEST - Testing with minimal complexity
 */

const axios = require('axios');
const io = require('socket.io-client');

async function simpleTest() {
  console.log('=== SIMPLE TEST ===');
  
  // Very simple query
  const query = 'What is 2+2';
  const sessionId = `simple-${Date.now()}`;
  
  console.log(`Query: "${query}"`);
  console.log(`Session: ${sessionId}`);
  
  // Connect socket FIRST
  const socket = io('http://localhost:3001', {
    transports: ['websocket'],
    reconnection: true
  });
  
  let events = [];
  let connected = false;
  
  // Set up event handlers
  socket.on('rendered', (data) => {
    // Check if this event is for our session (in case of broadcast)
    if (data.targetSession && data.targetSession !== sessionId) {
      return; // Skip events for other sessions
    }
    
    console.log('\n=== RECEIVED EVENT ===');
    events.push(data);
    
    if (data.plan) {
      console.log(`Plan: ${data.plan.title}`);
    }
    
    if (data.step) {
      console.log(`Step ${data.step.id}: ${data.step.desc}`);
    }
    
    if (data.actions) {
      console.log(`Actions: ${data.actions.length}`);
      data.actions.forEach(a => {
        console.log(`  - ${a.op}: ${a.text || a.tex || ''}`);
      });
    }
  });
  
  // Wait for connection and join room
  await new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✓ Connected');
      connected = true;
      // Join the room with the sessionId
      socket.emit('join', { sessionId });
      console.log(`✓ Joined room: ${sessionId}`);
      setTimeout(resolve, 500); // Give time for join to complete
    });
  });
  
  if (!connected) {
    console.log('✗ Failed to connect to socket');
    return;
  }
  
  // Send query AFTER joining the room
  console.log('\nSending query...');
  const res = await axios.post('http://localhost:3001/api/query', {
    query,
    sessionId
  });
  console.log(`Response: ${JSON.stringify(res.data)}`);
  
  // Wait for events
  console.log('\nWaiting 20 seconds...');
  await new Promise(r => setTimeout(r, 20000));
  
  socket.disconnect();
  
  // Results
  console.log('\n=== RESULTS ===');
  console.log(`Events received: ${events.length}`);
  
  if (events.length > 0) {
    console.log('✅ SUCCESS - System is working!');
    
    // Show what we got
    const hasPlans = events.some(e => e.plan);
    const hasSteps = events.some(e => e.step);
    const hasActions = events.some(e => e.actions && e.actions.length > 0);
    
    console.log(`Has plans: ${hasPlans ? '✓' : '✗'}`);
    console.log(`Has steps: ${hasSteps ? '✓' : '✗'}`);
    console.log(`Has actions: ${hasActions ? '✓' : '✗'}`);
  } else {
    console.log('❌ FAILURE - No events received');
  }
  
  process.exit(events.length > 0 ? 0 : 1);
}

simpleTest().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
