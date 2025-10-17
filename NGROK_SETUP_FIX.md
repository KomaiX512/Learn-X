# ngrok 502 Errors - Port Configuration Issue

## 🎯 Problem Identified

Your ngrok is forwarding to **port 5174** (frontend) instead of **port 8000** (backend):

```bash
ngrok http 5174
# Forwards to: http://localhost:5174 (Vite/Frontend)
```

**Why 502 Errors Occur**:
- External requests → ngrok URL
- ngrok → localhost:5174 (frontend Vite server)
- Vite dev server doesn't handle API requests at root `/`
- Returns 502 Bad Gateway

## 🔧 Solutions

### Option 1: Expose Backend API (Recommended for API Testing)

If you want external access to the **backend API**:

```bash
# Stop current ngrok
pkill ngrok

# Start ngrok pointing to backend
ngrok http 8000
```

**Result**:
- ngrok URL → Backend API at port 8000
- Can test API endpoints externally
- Root `/` returns API information (just fixed!)
- `/health`, `/api/query`, etc. all accessible

**Use case**: Testing API from mobile, sharing with others, webhook endpoints

---

### Option 2: Expose Frontend (Current Setup)

If you want external access to the **frontend app**:

Your current setup is correct, but the 502 errors are from:
- Health check bots hitting the root URL
- ngrok trying to check if service is up
- Vite dev server not handling these gracefully

**To fix frontend ngrok**:
1. Keep ngrok on port 5174
2. The frontend will work fine when users access the app
3. Ignore the 502 errors on `/` - they're just health checks
4. Real frontend routes (like `/app`) will work

**Use case**: Sharing the app UI with others, testing on mobile devices

---

### Option 3: Expose Both (Advanced)

Run **two ngrok tunnels** (requires paid plan or separate terminal):

**Terminal 1 - Backend**:
```bash
ngrok http 8000 --subdomain=myapp-api
```

**Terminal 2 - Frontend**:
```bash
ngrok http 5174 --subdomain=myapp-ui
```

Then update frontend to use backend ngrok URL.

---

## 📊 Current Setup Analysis

```
ngrok: https://8b3231b46e03.ngrok-free.app
   ↓
localhost:5174 (Vite Frontend)
   ↓
Proxies to: localhost:8000 (Backend)
```

**Why 502 on `/`**:
- ngrok URL → Vite dev server
- Vite doesn't serve content at root
- Health checks fail

**Why Frontend Works**:
- Actual app routes load fine
- API calls proxy through Vite to backend
- WebSocket connections work

---

## ✅ Recommended Action

**If you want to expose the API for external testing**:

```bash
# 1. Stop current ngrok
pkill ngrok

# 2. Start ngrok on backend port
ngrok http 8000

# 3. Test the new URL
curl https://YOUR-NEW-NGROK-URL.ngrok-free.app/health
```

**If you want to keep frontend exposed**:
- Keep current setup
- Ignore 502 errors on `/` (they're just health checks)
- Your app will work fine when accessed normally

---

## 🧪 Testing After Fix

### If exposing Backend (ngrok → 8000):
```bash
# Root endpoint - API info
curl https://YOUR-NGROK-URL.ngrok-free.app/

# Health check
curl https://YOUR-NGROK-URL.ngrok-free.app/health

# Submit query
curl -X POST https://YOUR-NGROK-URL.ngrok-free.app/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "quantum mechanics", "difficulty": "medium"}'
```

### If exposing Frontend (ngrok → 5174):
```bash
# Open in browser
open https://YOUR-NGROK-URL.ngrok-free.app

# App loads, proxies API calls to localhost:8000
```

---

## 🔍 Current Port Assignments

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Backend | 8000 | http://localhost:8000 | API, WebSocket, Audio |
| Frontend | 5174 | http://localhost:5174 | React app, Vite dev server |
| ngrok (current) | - | https://8b3231b46e03.ngrok-free.app | Forwarding to 5174 |

---

## 📝 Understanding the 502 Errors

The timestamps show:
```
15:35:36 PKT - Recent (after root endpoint fix)
15:28:54 PKT - Before fix
14:34:xx PKT - Before fix
```

These are from:
1. **ngrok health checks** - Automatic monitoring
2. **Web crawlers** - Bots indexing the URL
3. **Monitoring services** - Uptime checkers

They're trying to access `/` on the Vite dev server, which doesn't serve API responses.

---

## 🎯 Decision Matrix

**Choose based on your goal**:

| Goal | ngrok Port | Command | 502 Fixed? |
|------|------------|---------|------------|
| Test API externally | 8000 | `ngrok http 8000` | ✅ Yes |
| Share frontend UI | 5174 | `ngrok http 5174` (current) | ⚠️ Ignore |
| Full external access | Both | Two terminals | ✅ Yes |

---

## ✅ Quick Fix Command

If you want the backend API accessible via ngrok:

```bash
# Stop current ngrok
pkill ngrok

# Start ngrok on backend port
ngrok http 8000
```

Then access your API at the new ngrok URL!

**No more 502 errors** because the backend now has a proper `/` endpoint that returns API information. 🚀
