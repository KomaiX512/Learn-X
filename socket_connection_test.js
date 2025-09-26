// Test WebSocket connection and verify content delivery
const io = require('socket.io-client');
const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';
const sessionId = `socket-test-${Date.now()}`;

console.log('🔌 Testing WebSocket Connection...');
console.log(`Session ID: ${sessionId}`);

// Connect to socket - matching frontend approach
const socket = io(BACKEND_URL, {
  transports: ['websocket'],
  reconnection: true
});

socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
  
  // Join the session room - MUST pass object with sessionId
  socket.emit('join', { sessionId: sessionId });
  console.log(`📍 Joining room: ${sessionId}`);
});

socket.on('joined', (data) => {
  console.log('✅ Joined room confirmed:', data.sessionId);
});

socket.on('test', (data) => {
  console.log('📨 Test message received:', data);
});

socket.on('disconnect', () => {
  console.log('❌ Socket disconnected');
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

// Listen for rendered content
let receivedChunks = 0;
socket.on('rendered', (data) => {
  receivedChunks++;
  console.log(`\n📦 RECEIVED CHUNK #${receivedChunks}`);
  console.log('Step ID:', data.stepId || data.step?.id);
  console.log('Plan Title:', data.plan?.title);
  
  if (data.actions && Array.isArray(data.actions)) {
    console.log(`Actions: ${data.actions.length} total`);
    
    // Count action types
    const actionTypes = {};
    data.actions.forEach(action => {
      actionTypes[action.op] = (actionTypes[action.op] || 0) + 1;
    });
    
    console.log('Action breakdown:');
    Object.entries(actionTypes).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
    
    // Show sample actions
    console.log('\nFirst 3 actions:');
    data.actions.slice(0, 3).forEach((action, i) => {
      console.log(`  ${i+1}. ${action.op}:`, 
        action.text || action.tex || (action.points ? action.points.length + ' points' : ''));
    });
  }
});

// Wait for connection then send query
setTimeout(async () => {
  if (!socket.connected) {
    console.log('⚠️ Socket not connected yet, waiting...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n📤 Sending test query...');
  
  try {
    const response = await axios.post(`${BACKEND_URL}/api/query`, {
      query: 'Draw a simple sine wave y = sin(x) with axis and labels',
      sessionId: sessionId
    });
    
    console.log('✅ Query accepted:', response.data);
    
    // Wait for content
    console.log('\n⏳ Waiting for rendered content...');
    
    setTimeout(() => {
      if (receivedChunks === 0) {
        console.log('\n❌ NO CONTENT RECEIVED!');
        console.log('Possible issues:');
        console.log('1. Socket not joined to correct room');
        console.log('2. Backend not emitting to room');
        console.log('3. Frontend event listeners not set up');
      } else {
        console.log(`\n✅ SUCCESS! Received ${receivedChunks} chunks`);
      }
      
      socket.disconnect();
      process.exit(0);
    }, 15000);
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    socket.disconnect();
    process.exit(1);
  }
}, 2000);
