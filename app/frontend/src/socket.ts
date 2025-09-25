import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let currentSession: string | null = null;

export function getSocket(sessionId: string) {
  console.log('[socket] getSocket called with sessionId:', sessionId);
  if (socket && currentSession === sessionId) {
    console.log('[socket] Reusing existing socket for session:', sessionId);
    return socket;
  }

  if (socket) {
    console.log('[socket] Disconnecting old socket');
    socket.disconnect();
    socket = null;
  }

  console.log('[socket] Creating new socket connection');
  socket = io('/', { transports: ['websocket'] });
  
  socket.on('connect', () => {
    console.log('[socket] Socket connected, joining session:', sessionId);
    socket!.emit('join', { sessionId });
  });

  currentSession = sessionId;
  console.log('[socket] Socket setup complete for session:', sessionId);
  return socket;
}
