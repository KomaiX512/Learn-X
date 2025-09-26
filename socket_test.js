#!/usr/bin/env node

const io = require('socket.io-client');

const sessionId = `socket-test-${Date.now()}`;
console.log(`Testing socket with session: ${sessionId}`);

const socket = io('http://localhost:3001', {
  transports: ['websocket']
});

// Listen for ALL events
socket.onAny((eventName, ...args) => {
  console.log(`[EVENT] ${eventName}:`, args);
});

socket.on('connect', () => {
  console.log('Connected!');
  console.log('Emitting join...');
  socket.emit('join', { sessionId });
});

socket.on('joined', (data) => {
  console.log('Joined acknowledged:', data);
});

socket.on('test', (data) => {
  console.log('TEST EVENT RECEIVED:', data);
});

socket.on('rendered', (data) => {
  console.log('RENDERED EVENT RECEIVED!');
  console.log('  Has plan:', !!data.plan);
  console.log('  Has step:', !!data.step);
  console.log('  Actions:', data.actions?.length || 0);
});

setTimeout(() => {
  console.log('Disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 10000);
