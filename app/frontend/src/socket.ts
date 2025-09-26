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

  console.log('[socket] Creating new socket connection');
  socket = io('/', { transports: ['websocket'] });
  
  // Reset join tracking
  joinedSession = null;
  joinPromise = new Promise<void>((resolve) => { resolveJoin = resolve; });

  socket.on('connect', () => {
    console.log('[socket] Socket connected, joining session:', sessionId);
    socket!.emit('join', { sessionId });
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
