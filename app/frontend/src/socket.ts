import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let currentSession: string | null = null;
let joinedSession: string | null = null;
let joinPromise: Promise<void> | null = null;
let resolveJoin: (() => void) | null = null;

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

  console.log('[socket] Creating new socket connection with reliability enhancements');
  // Use relative URL to connect to the same host serving the frontend
  // This works for both localhost and ngrok deployment
  const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
  console.log('[socket] Connecting to backend:', backendUrl);
  socket = io(backendUrl, {
    transports: ['websocket', 'polling'],  // Allow fallback to polling
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });
  
  // Reset join tracking
  joinedSession = null;
  joinPromise = new Promise<void>((resolve) => { resolveJoin = resolve; });

  socket.on('connect', () => {
    console.log('[socket] Socket connected, joining session:', sessionId);
    socket!.emit('join', { sessionId });
    
    // Re-join on reconnection
    currentSession = sessionId;
    joinedSession = null;
  });
  
  socket.on('reconnect', (attemptNumber) => {
    console.log(`[socket] Reconnected after ${attemptNumber} attempts`);
    // Re-join room after reconnection
    if (currentSession) {
      socket!.emit('join', { sessionId: currentSession });
    }
  });
  
  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`[socket] Reconnection attempt ${attemptNumber}`);
  });
  
  socket.on('reconnect_error', (error) => {
    console.error('[socket] Reconnection error:', error.message);
  });
  
  socket.on('reconnect_failed', () => {
    console.error('[socket] Reconnection failed after all attempts');
  });

  socket.on('joined', (e: { sessionId: string }) => {
    console.log('[socket] Joined room ack for session:', e.sessionId);
    joinedSession = e.sessionId;
    if (resolveJoin) {
      resolveJoin();
    }
  });

  currentSession = sessionId;
  console.log('[socket] Socket setup complete for session:', sessionId);
  return socket;
}

export async function waitForJoin(expectedSessionId: string, timeoutMs = 3000) {
  if (joinedSession === expectedSessionId) return;
  if (!joinPromise) return;
  let timer: any;
  await Promise.race([
    joinPromise,
    new Promise<void>((_, reject) => {
      timer = setTimeout(() => reject(new Error('join timeout')), timeoutMs);
    })
  ]).finally(() => clearTimeout(timer));
}
