#!/usr/bin/env node

const { io } = require('socket.io-client');

async function testSocket(sessionId) {
  const socket = io('http://localhost:3001', { transports: ['websocket'] });

  socket.on('connect', () => {
    console.log(`🔌 Connected, joining session ${sessionId}`);
    socket.emit('join', { sessionId });
  });

  socket.on('rendered', (payload) => {
    console.log(`🎨 RECEIVED RENDERED:`, payload.step?.desc);
    if (payload.actions) {
      console.log(`   Actions: ${payload.actions.length}`);
    }
  });

  socket.on('connect_error', (err) => {
    console.error('Connection error:', err);
  });

  // Wait a bit and then disconnect
  setTimeout(() => {
    socket.disconnect();
  }, 10000);
}

testSocket('test-session');
