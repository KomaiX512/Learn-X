# IMMEDIATE FIX PLAN - Get System Actually Running

## Problem Summary

**Test Result**: System received query but delivered NOTHING in 5 minutes.

**Root Causes**:
1. Old backend process still running (port conflict)
2. New backend never started
3. Orchestrator not processing queries
4. Zero logging to debug issues

---

## Step-by-Step Fix

### 1. Nuclear Cleanup (Kill Everything)

```bash
# Kill all Node processes
pkill -9 -f "node"
pkill -9 -f "npm"
pkill -9 -f "ts-node"

# Verify all ports are free
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null

# Clear Redis
redis-cli FLUSHDB

# Verify
lsof -i:8000  # Should show nothing
lsof -i:3001  # Should show nothing
lsof -i:5173  # Should show nothing
```

### 2. Fix Backend Startup Script

The issue is the .env PORT variable might not be loaded. Add explicit logging:

**File: `/home/komail/LEAF/Learn-X/app/backend/package.json`**

Change:
```json
"dev": "ts-node-dev --respawn --transpile-only src/index.ts"
```

To:
```json
"dev": "node -r dotenv/config node_modules/.bin/ts-node-dev --respawn --transpile-only src/index.ts"
```

### 3. Add Startup Logging

**File: `/home/komail/LEAF/Learn-X/app/backend/src/index.ts`**

Add after line 19:
```typescript
async function main() {
  // CRITICAL: Log startup info
  console.log('='.repeat(60));
  console.log('BACKEND STARTING');
  console.log('='.repeat(60));
  console.log('PORT:', PORT);
  console.log('FRONTEND_URLS:', FRONTEND_URLS);
  console.log('REDIS_URL:', REDIS_URL);
  console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '***SET***' : '❌ MISSING');
  console.log('USE_VISUAL_VERSION:', process.env.USE_VISUAL_VERSION || 'not set');
  console.log('='.repeat(60));
  
  const app = express();
  // ... rest of code
```

### 4. Add Orchestrator Logging

**File: `/home/komail/LEAF/Learn-X/app/backend/src/orchestrator.ts`**

Add at start of `enqueuePlan`:
```typescript
async enqueuePlan(query: string, sessionId: string) {
  console.log(`[ORCHESTRATOR] 🚀 ENQUEUE PLAN: "${query}" for session ${sessionId}`);
  await this.planQueue.add('plan', { query, sessionId });
  console.log(`[ORCHESTRATOR] ✅ Plan job added to queue`);
}
```

Add at start of parallel worker:
```typescript
const parallelWorker = new Worker(
  'parallel-gen-jobs',
  async (job) => {
    console.log(`[PARALLEL-WORKER] 🔥 JOB STARTED for session ${sessionId}`);
    console.log(`[PARALLEL-WORKER] Query: "${query}"`);
    console.log(`[PARALLEL-WORKER] Plan has ${plan.steps.length} steps`);
    // ... rest of code
```

### 5. Start Backend with Full Logging

```bash
cd /home/komail/LEAF/Learn-X/app/backend

# Set environment explicitly
export PORT=8000
export REDIS_URL=redis://localhost:6379
export GEMINI_API_KEY=AIzaSyA81cKcfFois0QfgGAczqVqLGyiShSBf24
export USE_VISUAL_VERSION=v3
export LOG_LEVEL=debug

# Start with output to file AND console
npm run dev 2>&1 | tee backend-startup.log
```

**Watch for**:
```
=== BACKEND STARTING ===
PORT: 8000
GEMINI_API_KEY: ***SET***
[orchestrator] NEW Plan worker created
[orchestrator] NEW Parallel worker created
Server listening on port 8000
```

### 6. Verify Orchestrator is Working

In another terminal:
```bash
# Send test query
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query":"test water"}' \
  -v

# Check Redis queues
redis-cli KEYS "bull:*"
redis-cli LLEN "bull:plan-jobs:wait"
redis-cli LLEN "bull:parallel-gen-jobs:wait"
```

**Expected**:
- HTTP 200 response with sessionId
- Redis should show jobs in queues
- Backend log should show "[ORCHESTRATOR] 🚀 ENQUEUE PLAN"

### 7. Start Frontend

```bash
cd /home/komail/LEAF/Learn-X/app/frontend
npm run dev
```

### 8. Run Simple Test

```javascript
// simple-test.js
const io = require('socket.io-client');

const socket = io('http://localhost:8000', {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
  
  socket.emit('query', {
    query: 'teach me about water',
    sessionId: socket.id
  });
});

socket.on('rendered', (data) => {
  console.log('📦 RECEIVED:', data.type, data);
  
  if (data.type === 'actions') {
    console.log('  Step:', data.stepId);
    console.log('  Actions:', data.actions?.length);
    process.exit(0);
  }
});

socket.on('progress', (data) => {
  console.log('📊 Progress:', data.message);
});

setTimeout(() => {
  console.log('❌ TIMEOUT - No response in 60s');
  process.exit(1);
}, 60000);
```

Run:
```bash
node simple-test.js
```

**Expected Output**:
```
✅ Connected: abc123
📊 Progress: Starting generation...
📦 RECEIVED: plan {...}
📊 Progress: Step 1 generating...
📦 RECEIVED: actions {stepId: 1, actions: [...]}
```

---

## Debugging Checklist

If test fails, check in order:

### ❌ No connection
- Backend not running
- Wrong port
- CORS issue

**Fix**: Check backend logs for "Server listening on port 8000"

### ❌ Connected but no plan
- Orchestrator not enqueuing
- BullMQ worker not started
- Redis connection issue

**Fix**: Check for "[ORCHESTRATOR] ENQUEUE PLAN" in logs

### ❌ Plan received but no steps
- Parallel worker not processing
- LLM API error
- Rate limiting

**Fix**: Check for "[PARALLEL-WORKER] JOB STARTED" in logs

### ❌ Steps generating but not emitting
- Socket rooms not working
- Emission logic broken

**Fix**: Check for "[parallel] 🚀 IMMEDIATELY EMITTED" in logs

### ❌ Steps emit but frontend doesn't receive
- WebSocket disconnected
- Frontend not listening
- Socket.IO version mismatch

**Fix**: Check browser console for WebSocket errors

---

## Expected Timeline for Working System

```
0s    → Backend starts, logs appear
5s    → Frontend connects
10s   → Send query
12s   → Plan generated and emitted
15s   → Parallel worker starts on 3 steps
50s   → Step 1 completes and emits
95s   → Step 2 completes and emits
140s  → Step 3 completes and emits
145s  → All done
```

**If this doesn't happen, the system is still broken.**

---

## Success Criteria

System is "working" when:

1. ✅ Backend starts without errors
2. ✅ Orchestrator logs show job enqueuing
3. ✅ Simple test receives plan within 15s
4. ✅ Simple test receives Step 1 within 60s
5. ✅ Backend logs show "IMMEDIATELY EMITTED"
6. ✅ No error messages in logs
7. ✅ Redis queues show jobs processing

**Only then** can we test quality, performance, and make claims.

---

## After Getting It Working

Once simple test passes:

1. Run full brutal-honest-test.js
2. Check for fallback activations
3. Verify visual quality
4. Measure actual timings
5. Test 5 different topics
6. Check for dummy content
7. Verify animations are contextual

**Then and only then** can we assess production readiness honestly.
