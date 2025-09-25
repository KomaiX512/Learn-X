#!/usr/bin/env node

const http = require('http');
const { io } = require('socket.io-client');

async function makeQuery(query) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query });
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
  const socket = io('http://localhost:3001', { transports: ['websocket'] });
  
  socket.on('connect', () => {
    console.log(`🔌 Connected to integration lesson for session ${sessionId}`);
    socket.emit('join', { sessionId });
  });

  socket.on('rendered', (payload) => {
    console.log(`🎨 INTEGRATION STEP ${payload.stepId}: ${payload.step?.desc || 'Unknown step'}`);
    if (payload.actions && payload.actions.length > 0) {
      payload.actions.forEach((action, i) => {
        if (action.op === 'drawLabel') {
          console.log(`   📝 Label: "${action.text}"`);
        } else if (action.op === 'drawCurve') {
          console.log(`   📈 Curve: ${action.points?.length || 0} points, color: ${action.color}`);
        } else {
          console.log(`   🎯 ${action.op.toUpperCase()}`);
        }
      });
    }
  });

  return socket;
}

async function testIntegrationLesson() {
  console.log('🧮 Testing Integration Visualization Lesson');
  console.log('==========================================');
  
  try {
    // Test integration query
    console.log('\n📚 Sending integration query...');
    const response = await makeQuery("Show me how integration works with visual examples");
    const sessionId = response.sessionId;
    console.log(`✅ Session created: ${sessionId}`);
    
    // Connect socket
    const socket = await connectSocket(sessionId);
    
    // Wait for initial step
    console.log('\n⏳ Waiting for step 1 (Integration introduction)...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Trigger step 2
    console.log('\n🔄 Triggering step 2 (Draw f(x) = x²)...');
    await triggerNextStep(sessionId);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Trigger step 3
    console.log('\n🔄 Triggering step 3 (Riemann rectangles)...');
    await triggerNextStep(sessionId);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Trigger step 4
    console.log('\n🔄 Triggering step 4 (Exact integral result)...');
    await triggerNextStep(sessionId);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n✅ Integration lesson test completed!');
    socket.disconnect();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testIntegrationLesson();
