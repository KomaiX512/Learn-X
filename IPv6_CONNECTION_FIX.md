# 🐛 IPv6 Connection Issue - FIXED

## Problem
Frontend couldn't connect to backend with error:
```
Error: connect ECONNREFUSED ::1:3000
```

## Root Causes

### 1. **IPv6 vs IPv4 Mismatch**
- Frontend proxy was using `localhost` which resolves to `::1` (IPv6)
- Backend was listening on IPv4 only
- Connection failed because of IP version mismatch

### 2. **Wrong Port Number**
- Backend runs on port **8000** (from .env file)
- Frontend was configured for port **3000**
- Connection refused because nothing was listening on port 3000

## Fixes Applied

### File 1: `app/frontend/vite.config.ts`

**BEFORE:**
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',  // ❌ Wrong: IPv6 + wrong port
  },
  '/socket.io': {
    target: 'http://localhost:3000',  // ❌ Wrong: IPv6 + wrong port
  }
}
```

**AFTER:**
```typescript
proxy: {
  '/api': {
    target: 'http://127.0.0.1:8000',  // ✅ Correct: IPv4 + correct port
  },
  '/socket.io': {
    target: 'http://127.0.0.1:8000',  // ✅ Correct: IPv4 + correct port
  }
}
```

### File 2: `app/frontend/src/socket.ts`

**BEFORE:**
```typescript
socket = io({  // ❌ No URL, defaults to same origin
  transports: ['websocket'],
});
```

**AFTER:**
```typescript
socket = io('http://127.0.0.1:8000', {  // ✅ Explicit URL with IPv4
  transports: ['websocket', 'polling'],  // ✅ Fallback to polling
});
```

### File 3: `app/backend/src/index.ts`

**BEFORE:**
```typescript
server.listen(PORT, () => {  // Defaults to IPv6 on some systems
  console.log('Server listening on port', PORT);
});
```

**AFTER:**
```typescript
server.listen(PORT, '0.0.0.0', () => {  // ✅ Listen on all interfaces
  console.log('Server listening on 0.0.0.0:' + PORT);
  console.log('Accessible via 127.0.0.1:' + PORT);
});
```

## How to Apply

### Step 1: Restart Backend
```bash
cd app/backend
# Stop if running (Ctrl+C)
npm run dev
```

**Expected Output:**
```
✅ SERVER READY
🌐 Backend URL: http://127.0.0.1:8000
📡 WebSocket Ready: ws://127.0.0.1:8000
```

### Step 2: Restart Frontend
```bash
cd app/frontend
# Stop if running (Ctrl+C)
npm run dev
```

**Expected Output:**
```
➜  Local:   http://localhost:5174/
[vite] connected.
```

### Step 3: Hard Refresh Browser
- **Chrome/Firefox**: Ctrl+Shift+R
- **Mac**: Cmd+Shift+R

## Verification

### Browser Console Should Show:
```javascript
[socket] Socket connected  ✅
[App] Session created: gen_123  ✅
```

### Should NOT Show:
```
Error: connect ECONNREFUSED ::1:3000  ❌ Gone!
Error: connect ECONNREFUSED ::1:8000  ❌ Gone!
```

### Backend Console Should Show:
```
[socket] Client connected  ✅
[socket] Client joined session  ✅
```

## Technical Details

### Why `127.0.0.1` instead of `localhost`?

**`localhost`** resolves differently on different systems:
- Some systems: `127.0.0.1` (IPv4)
- Other systems: `::1` (IPv6)
- Can cause connection issues if server doesn't listen on both

**`127.0.0.1`** is:
- Always IPv4
- Explicit and predictable
- No DNS resolution needed
- Works consistently everywhere

### Why Listen on `0.0.0.0`?

**`0.0.0.0`** means:
- Listen on ALL network interfaces
- Accept connections from IPv4 and IPv6
- Accessible via `127.0.0.1`, `localhost`, and LAN IP
- Best practice for development servers

## Port Reference

```
Backend:   http://127.0.0.1:8000  ✅
Frontend:  http://localhost:5174   ✅
Redis:     redis://localhost:6379  ✅
```

## Test Connectivity

### Quick Test (Terminal):
```bash
# Test backend is running
curl http://127.0.0.1:8000/health

# Should return:
{"status":"ok","uptime":123.456}
```

### Full Test:
1. Open http://localhost:5174
2. Open DevTools (F12)
3. Check Console for connection logs
4. Start a lecture
5. Verify steps render

## Common Errors After Fix

### "Connection refused" still appearing?
→ Backend not running on port 8000
→ Check: `lsof -i :8000`

### "CORS error"?
→ Frontend URL not in CORS allowlist
→ Check backend .env: `FRONTEND_URL=http://localhost:5174`

### Socket disconnects?
→ Redis not running
→ Start: `redis-server` or `brew services start redis`

## Status

✅ **IPv6 issue FIXED** - Using explicit IPv4 addresses
✅ **Port issue FIXED** - Corrected to 8000
✅ **Backend FIXED** - Listening on 0.0.0.0
✅ **Frontend FIXED** - All proxies updated
✅ **Socket FIXED** - Explicit connection URL

**System ready for testing!** 🚀
