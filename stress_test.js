#!/usr/bin/env node

const http = require('http');
const { io } = require('socket.io-client');

// Test configuration
const BACKEND_URL = 'http://localhost:3001';
const TEST_QUERIES = [
  "Visualize RC circuit charging with mathematical details",
  "Explain capacitor discharge in RC circuit", 
  "Show RC circuit time constant visualization",
  "Demonstrate RC circuit transient response",
  "Visualize RC circuit with different parameter values"
];

const TEST_PARAMS = [
  { R: 1000, C: 0.000001, V: 5 },
  { R: 2000, C: 0.000002, V: 12 },
  { R: 500, C: 0.000005, V: 3.3 },
  { R: 10000, C: 0.0000001, V: 15 },
  { R: 1500, C: 0.000003, V: 9 }
];

async function makeQuery(query, params) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query, params });
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function triggerNextStep(sessionId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/session/${sessionId}/next`,
      method: 'POST'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.end();
  });
}

async function connectSocket(sessionId) {
  const socket = io(BACKEND_URL, { transports: ['websocket'] });
  
  socket.on('connect', () => {
    console.log(`🔌 Socket connected for session ${sessionId}`);
    socket.emit('join', { sessionId });
  });

  socket.on('rendered', (payload) => {
    console.log(`🎨 RENDERED EVENT for session ${sessionId}:`);
    console.log(`   Step ID: ${payload.stepId}`);
    console.log(`   Actions: ${payload.actions?.length || 0}`);
    console.log(`   Step desc: ${payload.step?.desc || 'N/A'}`);
    if (payload.actions && payload.actions.length > 0) {
      payload.actions.forEach((action, i) => {
        console.log(`     Action ${i+1}: ${action.op}`);
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected for session ${sessionId}`);
  });

  return socket;
}

async function stressTest() {
  console.log('🚀 Starting LeaF Stress Test...');
  console.log('=====================================');
  
  const sessions = [];
  const sockets = [];

  // Create multiple concurrent queries
  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const query = TEST_QUERIES[i];
    const params = TEST_PARAMS[i];
    
    console.log(`\n📝 Query ${i+1}: "${query}"`);
    console.log(`   Params: R=${params.R}Ω, C=${params.C}F, V=${params.V}V`);
    
    try {
      const response = await makeQuery(query, params);
      const sessionId = response.sessionId;
      sessions.push(sessionId);
      
      console.log(`   ✅ Session created: ${sessionId}`);
      
      // Connect socket for this session
      const socket = await connectSocket(sessionId);
      sockets.push(socket);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n⏳ Waiting 3 seconds for initial processing...`);
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Trigger next steps for all sessions
  console.log(`\n🔄 Triggering next steps for all sessions...`);
  for (let sessionId of sessions) {
    try {
      await triggerNextStep(sessionId);
      console.log(`   ✅ Next step triggered for ${sessionId}`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    } catch (error) {
      console.log(`   ❌ Error triggering next step for ${sessionId}: ${error.message}`);
    }
  }

  console.log(`\n⏳ Waiting 2 seconds for step processing...`);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Trigger final steps
  console.log(`\n🔄 Triggering final steps...`);
  for (let sessionId of sessions) {
    try {
      await triggerNextStep(sessionId);
      console.log(`   ✅ Final step triggered for ${sessionId}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`   ❌ Error triggering final step for ${sessionId}: ${error.message}`);
    }
  }

  console.log(`\n⏳ Final wait for processing...`);
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Close all sockets
  console.log(`\n🔌 Closing socket connections...`);
  sockets.forEach(socket => socket.disconnect());

  console.log(`\n✅ Stress test completed!`);
  console.log(`📊 Summary: ${sessions.length} sessions tested`);
}

// Run the stress test
stressTest().catch(console.error);
