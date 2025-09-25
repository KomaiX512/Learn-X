import React, { useEffect, useMemo, useState } from 'react';
import CanvasStage from './components/CanvasStage';
import { getSocket } from './socket';
import { execChunk } from './renderer';

export default function App() {
  const [query, setQuery] = useState('Visualize the charging of an RC circuit and annotate the time constant');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<any>(null);
  const [planTitle, setPlanTitle] = useState<string>('');
  const [isReady, setIsReady] = useState(false);
  const [R, setR] = useState(1000); // Ohms
  const [C, setC] = useState(0.000001); // Farads (1 uF)
  const [V, setV] = useState(5); // Volts

  // Ensure we have a session and that the socket has joined it before enqueuing work
  function ensureSession(): string {
    const sid =
      sessionId ||
      (typeof window !== 'undefined' && (window as any).crypto?.randomUUID
        ? (window as any).crypto.randomUUID()
        : Math.random().toString(36).slice(2));
    if (!sessionId) {
      setSessionId(sid);
    }
    // Eagerly connect and join the room to avoid missing early renders
    getSocket(sid);
    return sid;
  }

  const socket = useMemo(() => (sessionId ? getSocket(sessionId) : null), [sessionId]);

  useEffect(() => {
    if (!socket) return;
    
    // Add connection event logging
    socket.on('connect', () => {
      console.log('[socket] Connected to backend, socket ID:', socket.id);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected from backend:', reason);
    });
    
    socket.on('connect_error', (error) => {
      console.error('[socket] Connection error:', error);
    });
    
    const handler = (payload: any) => {
      console.log('[socket] Received "rendered" event:', payload);
      console.log('[socket] Payload type:', typeof payload, 'keys:', Object.keys(payload || {}));
      if (!payload || !payload.step) {
        console.error('[socket] Invalid payload received for "rendered" event:', payload);
        return;
      }
      console.log('[socket] About to call execChunk with:', payload);
      execChunk(payload);
      setCurrentStep(payload.step);
      if (payload.plan?.title) {
        setPlanTitle(payload.plan.title);
      }
      if (payload.step?.id === 1) {
        setIsReady(true);
      }
    };
    socket.on('rendered', handler);
    
    // Log all events for debugging
    socket.onAny((event, ...args) => {
      console.log('[socket] Received any event:', event, args);
    });
    
    return () => {
      socket.off('rendered', handler);
      socket.off('connect');
      socket.off('disconnect'); 
      socket.off('connect_error');
      socket.offAny();
    };
  }, [socket]);

  // Auto-run once on mount to kick off the demo (pre-join socket to avoid race)
  useEffect(() => {
    (async () => {
      try {
        const sid = ensureSession();
        console.log('Fetching /api/query');
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, params: { R, C, V }, sessionId: sid })
        });
        const data = await res.json();
        console.log('auto-run session', data);
        setSessionId((prev) => prev || data.sessionId || sid);
      } catch (e) {
        console.error('auto-run error', e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    setIsReady(false);
    const sid = ensureSession();
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, params: { R, C, V }, sessionId: sid })
    });
    const data = await res.json();
    // keep existing sid if backend echoes a different one
    setSessionId((prev) => prev || data.sessionId || sid);
  }

  async function nextStep() {
    if (!sessionId) return;
    await fetch(`/api/session/${sessionId}/next`, { method: 'POST' });
  }

  async function updateParams(next: { R?: number; C?: number; V?: number }) {
    if (!sessionId) return;
    const body = { R, C, V, ...next };
    await fetch(`/api/session/${sessionId}/params`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, Arial, sans-serif', padding: 16 }}>
      <h2>Universal Interactive Learning Engine (MVP)</h2>
      {planTitle && <h3 style={{ marginTop: 0 }}>{planTitle}</h3>}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 320 }}>
          <label style={{ display: 'block', fontWeight: 600 }}>Query</label>
          <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={3} style={{ width: '100%' }} />
          <button onClick={submit} style={{ marginTop: 8 }}>Run</button>
          <button onClick={nextStep} style={{ marginTop: 8, marginLeft: 8 }} disabled={!isReady}>Next Step</button>

          {currentStep && (
            <div style={{ marginTop: 16, padding: 8, background: '#f0f0f0', borderRadius: 4 }}>
              <strong>Current Step:</strong> {currentStep.desc}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div>
              <label>R (Ohms): {R}</label>
              <input type="range" min="100" max="10000" step="100" value={R}
                     onChange={(e) => {
                       const val = parseInt(e.target.value, 10);
                       setR(val);
                       updateParams({ R: val });
                     }} />
            </div>
            <div>
              <label>C (uF): {(C * 1e6).toFixed(2)}</label>
              <input type="range" min="0.1" max="100" step="0.1" value={C * 1e6}
                     onChange={(e) => {
                       const val = parseFloat(e.target.value) / 1e6;
                       setC(val);
                       updateParams({ C: val });
                     }} />
            </div>
            <div>
              <label>V (Volts): {V}</label>
              <input type="range" min="1" max="12" step="1" value={V}
                     onChange={(e) => {
                       const val = parseInt(e.target.value, 10);
                       setV(val);
                       updateParams({ V: val });
                     }} />
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 600 }}>
          <CanvasStage />
        </div>
      </div>
    </div>
  );
}
