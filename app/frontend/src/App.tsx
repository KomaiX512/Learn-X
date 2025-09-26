import React, { useEffect, useMemo, useState } from 'react';
import CanvasStage from './components/CanvasStage';
import { getSocket, waitForJoin } from './socket';
import { execChunk } from './renderer';

export default function App() {
  const [query, setQuery] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<any>(null);
  const [planTitle, setPlanTitle] = useState<string>('');
  const [planSubtitle, setPlanSubtitle] = useState<string>('');
  const [toc, setToc] = useState<Array<{ minute: number; title: string; summary?: string }>>([]);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    
    socket.on('rendered', (e) => {
      console.log('=== FRONTEND RECEIVED RENDERED EVENT ===');
      console.log('Event data:', e);
      console.log('Step:', e.step);
      console.log('Actions:', e.actions);
      console.log('Plan title:', e.plan?.title);
      console.log('Plan subtitle:', e.plan?.subtitle);
      console.log('Plan toc:', e.plan?.toc);
      console.log('=== END FRONTEND EVENT ===');
      
      // Update plan title
      if (e.plan?.title) {
        setPlanTitle(e.plan.title);
      }
      if (e.plan?.subtitle) {
        setPlanSubtitle(e.plan.subtitle);
      }
      if (Array.isArray(e.plan?.toc)) {
        setToc(e.plan.toc);
      }
      
      // Update current step
      setCurrentStep(e.step);
      
      // Execute the rendering actions on canvas
      execChunk(e);
      
      setIsReady(true);
      setIsLoading(false);
    });
    
    
    return () => {
      socket.off('connect');
      socket.off('disconnect'); 
      socket.off('connect_error');
    };
  }, [socket]);

  // Auto-run once on mount to kick off the demo (pre-join socket to avoid race)
  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const sid = ensureSession();
  //       console.log('Fetching /api/query');
  //       const res = await fetch('/api/query', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ query, params: { R, C, V }, sessionId: sid })
  //       });
  //       const data = await res.json();
  //       console.log('auto-run session', data);
  //       setSessionId((prev) => prev || data.sessionId || sid);
  //     } catch (e) {
  //       console.error('auto-run error', e);
  //     }
  //   })();
  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  async function submit() {
    setIsReady(false);
    setIsLoading(true);
    const sid = ensureSession();
    try {
      await waitForJoin(sid, 3000);
    } catch (e) {
      console.warn('[submit] join wait failed, proceeding anyway:', e);
    }
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, sessionId: sid })
    });
    const data = await res.json();
    // keep existing sid if backend echoes a different one
    setSessionId((prev) => prev || data.sessionId || sid);
  }

  async function nextStep() {
    if (!sessionId) return;
    await fetch(`/api/session/${sessionId}/next`, { method: 'POST' });
  }


  return (
    <div style={{ fontFamily: 'Inter, system-ui, Arial, sans-serif', padding: 16 }}>
      <h2>Universal Interactive Learning Engine (MVP)</h2>
      {planTitle && <h3 style={{ marginTop: 0 }}>{planTitle}</h3>}
      {planSubtitle && <div style={{ marginTop: 4, color: '#555' }}>{planSubtitle}</div>}
      {toc.length > 0 && (
        <div style={{ marginTop: 8, padding: 8, background: '#fafafa', border: '1px solid #eee', borderRadius: 6 }}>
          <strong>Table of Contents (5-minute plan)</strong>
          <ol style={{ margin: '8px 0 0 20px' }}>
            {toc.sort((a,b)=>a.minute-b.minute).map((item) => (
              <li key={item.minute}>
                <span style={{ fontWeight: 600 }}>Minute {item.minute}:</span> {item.title}
                {item.summary ? <div style={{ color: '#666' }}>{item.summary}</div> : null}
              </li>
            ))}
          </ol>
        </div>
      )}
      {planSubtitle && <h4 style={{ marginTop: 0 }}>{planSubtitle}</h4>}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 320 }}>
          <label style={{ display: 'block', fontWeight: 600 }}>Query</label>
          <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={3} style={{ width: '100%' }} placeholder="Type your topic (e.g., 'Explain H2O molecular structure and hydrogen bonding')" />
          <button onClick={submit} style={{ marginTop: 8 }} disabled={!query.trim()}>Run</button>
          <button onClick={nextStep} style={{ marginTop: 8, marginLeft: 8 }} disabled={!isReady}>Next Step</button>

          {currentStep && (
            <div style={{ marginTop: 16, padding: 8, background: '#f0f0f0', borderRadius: 4 }}>
              <strong>Current Step:</strong> {currentStep?.desc}
            </div>
          )}

        </div>
        <div style={{ flex: 1, minWidth: 600 }}>
          <CanvasStage title={planTitle} />
        </div>
      </div>
    </div>
  );
}
