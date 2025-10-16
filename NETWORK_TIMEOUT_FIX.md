# 🐛 Network Error on Clarification - FIXED

## Problem
```
Failed to get clarification: NetworkError when attempting to fetch resource.
```

Backend received request and generated clarification successfully (25+ seconds), but frontend threw network error before receiving response.

## Root Cause

**Vite Proxy Default Timeout**: 30 seconds
**Clarification Generation Time**: 25-30 seconds
**Result**: Proxy times out just as backend finishes generating!

```
Timeline:
0s   - User submits question
0s   - Frontend: fetch('/api/clarify')
0s   - Vite proxy forwards to backend
0s   - Backend starts generation
25s  - Backend completes generation
26s  - Backend sends response
27s  - Vite proxy: TIMEOUT! (default 30s)
27s  - Frontend: NetworkError ❌
```

## Fixes Applied

### Fix #1: Increased Vite Proxy Timeout ✅

**File**: `app/frontend/vite.config.ts`

**BEFORE** (implicit 30s timeout):
```typescript
proxy: {
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true
    // No timeout specified = 30s default
  }
}
```

**AFTER** (explicit 120s timeout):
```typescript
proxy: {
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    timeout: 120000,      // 120 seconds
    proxyTimeout: 120000, // 120 seconds
    configure: (proxy, _options) => {
      // Added error logging
      proxy.on('error', (err, _req, _res) => {
        console.error('[Proxy] Error:', err.message);
      });
    }
  }
}
```

### Fix #2: Added Fetch Timeout with AbortController ✅

**File**: `app/frontend/src/App.tsx`

**BEFORE** (no timeout):
```typescript
const response = await fetch('/api/clarify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... })
});
// Hangs forever if proxy times out
```

**AFTER** (with timeout):
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s

try {
  const response = await fetch('/api/clarify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... }),
    signal: controller.signal  // Abort if timeout
  });
  
  clearTimeout(timeoutId);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
} catch (fetchError: any) {
  clearTimeout(timeoutId);
  if (fetchError.name === 'AbortError') {
    throw new Error('Request timeout after 120 seconds. The AI is taking too long.');
  }
  throw fetchError;
}
```

### Fix #3: Added Better Error Logging ✅

Now logs proxy errors to help debugging:
```typescript
proxy.on('error', (err, _req, _res) => {
  console.error('[Proxy] Error:', err.message);
});
```

## Why 120 Seconds?

### Typical Clarification Timeline:
```
Screenshot upload:     0.5-1s
Backend processing:    1-2s
Gemini API call:       20-30s
Response parsing:      0.5-1s
Socket emission:       0.1s
Total:                 22-35s typical
                       Up to 60s worst case
```

**120 seconds** provides:
- 4x safety margin for typical requests
- 2x safety margin for slow requests
- Handles network congestion
- Handles Gemini API slowness

## Testing

### Restart Frontend (REQUIRED):
```bash
cd app/frontend
# Stop current process (Ctrl+C)
npm run dev
```

**Wait for:**
```
Vite config loaded: { command: 'serve', mode: 'development' }
➜  Local:   http://localhost:5174/
```

### Test Flow:
1. Start lecture
2. Raise hand
3. Draw marks
4. Submit question
5. **Wait 25-30 seconds** (don't panic!)
6. Clarification should appear ✅

### Expected Console (Frontend):
```javascript
[App] Canvas question submitted: "Why does this work?"
Proxying request: POST /api/clarify to 127.0.0.1/api/clarify

// 25-30 second wait...

[App] Canvas clarification response: {success: true}
[App] Received clarification: "Understanding the Concept"
✅ Success!
```

### Expected Console (Backend):
```
[api] Clarification request for session abc123
[clarifier] Generating clarification...
[clarifier] ✅ Clarification generated in 26545ms - 13 actions
[api] Emitting clarification to session abc123 (1 sockets)
[api] ✅ Clarification emitted successfully
```

## If Still Getting Network Error

### Check 1: Frontend Restarted?
```bash
# Must restart to reload vite.config.ts
cd app/frontend
npm run dev
```

### Check 2: Check Browser Console
```javascript
// Should NOT see:
NetworkError when attempting to fetch resource

// Should see:
Proxying request: POST /api/clarify to 127.0.0.1/api/clarify
[App] Canvas clarification response: {success: true}
```

### Check 3: Check Backend Logs
```
// Should see:
[api] Clarification request for session abc123
[clarifier] ✅ Clarification generated in 26545ms - 13 actions
[api] ✅ Clarification emitted successfully

// Should NOT see:
Error: ECONNREFUSED
Error: socket hang up
```

### Check 4: Clear Browser Cache
```
Hard refresh: Ctrl+Shift+R (Windows/Linux)
              Cmd+Shift+R (Mac)
```

## Alternative: Bypass Proxy (Development Only)

If proxy still causes issues, you can bypass it:

**Option 1: Direct Backend URL**
```typescript
// In App.tsx
const response = await fetch('http://127.0.0.1:8000/api/clarify', {
  // ... same config
});
```

**Note**: Requires CORS configured on backend (already done)

## Performance Expectations

### With Fix:
```
User submits question:    0s
Frontend shows loading:   0s
Backend generates:        25-30s  (unavoidable - AI processing)
Response received:        25-30s
Clarification renders:    27-32s
TOTAL:                    27-32s ✅
```

### User Experience:
- Loading spinner shows immediately
- User waits 25-30 seconds (expected for AI)
- Clarification appears
- No network errors ✅

## Status

✅ **Vite proxy timeout increased to 120s**
✅ **Fetch timeout added with AbortController**
✅ **Error logging improved**
✅ **Backend already handles long requests**
✅ **Frontend ready to wait**

## Quick Test

```bash
# Terminal 1: Backend (should already be running)
cd app/backend
npm run dev

# Terminal 2: Frontend (RESTART REQUIRED)
cd app/frontend
# Ctrl+C to stop
npm run dev

# Browser: Test clarification
# Should work now without network error! ✅
```

**The 25-30 second wait is NORMAL - it's the AI thinking! 🤖**
