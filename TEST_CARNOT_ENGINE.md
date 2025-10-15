# 🔬 CARNOT ENGINE INTEGRATION TEST - PROVE TTS WORKS

**Query:** "teach me about the carnot engine"  
**Expected:** Browser TTS speaks narration for each visual  
**NO SUGAR COATING:** Either works or fails - we'll see the truth

---

## 🚀 STEP 1: START BACKEND

```bash
cd /home/komail/LEAF/Learn-X/app/backend
npm run dev
```

**Expected output:**
```
✅ Backend server listening on port 8000
✅ Socket.IO ready
✅ Orchestrator initialized
```

**Leave this running!**

---

## 🚀 STEP 2: START FRONTEND (New Terminal)

```bash
cd /home/komail/LEAF/Learn-X/app/frontend
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Leave this running!**

---

## 🧪 STEP 3: TEST IN BROWSER

1. **Open browser:** `http://localhost:5173`

2. **Type query:** "teach me about the carnot engine"

3. **Click "Generate Lesson"** or press Enter

4. **WATCH CONSOLE (F12)** for TTS logs:

### **✅ SUCCESS SIGNS:**

```javascript
[BrowserTTS] ✅ Initialized with 10+ voices
[TTS] Loading narrations: {...}
[TTS] 🎤 Starting Browser TTS for visual 0...
[BrowserTTS] 🗣️ Speaking: "The Carnot engine..."
[BrowserTTS] ▶️ Speech started
[BrowserTTS] ✅ Speech completed in 8.2s
```

**AND YOU SHOULD HEAR:** Real human voice speaking about Carnot engine!

### **❌ FAILURE SIGNS:**

```javascript
[TTS] ❌ Audio error
[TTS] No narration for visual 0
Failed to load because no supported source
```

**AND YOU HEAR:** Nothing / Silence

---

## 🔍 WHAT TO CHECK

### **1. Browser Console Logs (F12 → Console tab)**

Look for these exact patterns:

✅ **Good:**
```
[BrowserTTS] ✅ Initialized
[TTS] 🎤 Starting Browser TTS
[BrowserTTS] 🗣️ Speaking
[BrowserTTS] ▶️ Speech started
[BrowserTTS] ✅ Speech completed
```

❌ **Bad:**
```
Error loading audio
No supported source
TTS not available
```

### **2. Backend Terminal Logs**

Look for:

✅ **Good:**
```
[orchestrator] Processing query: teach me about the carnot engine
[planner] Generated 3-step plan
[narration] Generating narrations...
[narration] ✅ Generated narrations for step 1
```

❌ **Bad:**
```
[narration] ❌ Failed to generate
Error: ...
```

### **3. What You HEAR**

✅ **Good:** Clear human voice saying things like:
- "The Carnot engine is a theoretical thermodynamic cycle..."
- "Let's explore the four stages of this cycle..."
- "Notice how efficiency depends on temperature difference..."

❌ **Bad:**
- Silence
- Garbled noise
- Error sounds

---

## 📊 DETAILED DEBUGGING

### **If NO SPEECH:**

1. **Check browser supports TTS:**
   ```javascript
   // Type in browser console:
   'speechSynthesis' in window
   // Should return: true
   ```

2. **Check available voices:**
   ```javascript
   // Type in browser console:
   speechSynthesis.getVoices()
   // Should return: Array of voices
   ```

3. **Test browser TTS directly:**
   ```javascript
   // Type in browser console:
   let utterance = new SpeechSynthesisUtterance('Hello World');
   speechSynthesis.speak(utterance);
   // Should speak "Hello World"
   ```

### **If Backend Not Generating Narrations:**

```bash
# Check backend logs for errors
tail -f /home/komail/LEAF/Learn-X/app/backend/*.log

# Look for:
❌ [narration] Failed to generate
❌ API error
❌ Timeout
```

### **If Narrations Generated But Not Speaking:**

```javascript
// Check frontend console:
[TTS] Loading narrations: {...}  // ← Should show narration data
[TTS] Has audio: false           // ← If false, narrations missing

// Check if TTS enabled:
[TTS] TTS disabled (enabled=false, audio=false)  // ← Should be true
```

---

## 🎯 EXPECTED COMPLETE FLOW

### **1. Query Submitted**
```
User types: "teach me about the carnot engine"
Frontend → Socket.IO → Backend
```

### **2. Backend Processing**
```
Backend logs:
[planner] Generating plan...
[planner] ✅ Generated 3 steps
[narration] Generating narrations for 5 visuals...
[narration] ✅ Visual 0: 87 chars
[narration] ✅ Visual 1: 93 chars
[narration] ✅ Visual 2: 81 chars
[narration] ✅ Visual 3: 95 chars
[narration] ✅ Visual 4: 88 chars
```

### **3. Frontend Receives Data**
```
Frontend logs:
[TTS] Loading narrations: Object{narrations: Array(5)}
[TTS] Total narrations loaded: 5
[TTS] Has audio: true (using Browser TTS)
```

### **4. Visual 0 Renders**
```
[CanvasStage] Rendering visual 0 (notes)
[TTS] 🎤 Starting Browser TTS for visual 0...
[BrowserTTS] 🗣️ Speaking: "The Carnot engine is..."
```

**YOU HEAR:** Speech starts!

### **5. Visual 0 Speech Completes**
```
[BrowserTTS] ✅ Speech completed in 8.5s
[TTS] ✅ Browser TTS complete for visual 0
[TTS] ⏸️ Applying inter-visual delay (5000ms)...
```

**Wait 5 seconds**

### **6. Visual 1 Renders**
```
[CanvasStage] Rendering visual 1 (animation)
[TTS] 🎤 Starting Browser TTS for visual 1...
[BrowserTTS] 🗣️ Speaking: "Let's explore the first stage..."
```

**YOU HEAR:** Next narration speaks!

### **7. Repeat for All Visuals**
```
Visual 2 → Speaks → Delay → Visual 3 → Speaks → Delay → Visual 4 → Speaks
```

### **8. Complete**
```
[TTS] 🏁 Visual 4 COMPLETE
All narrations spoken successfully!
```

---

## 🏆 SUCCESS CRITERIA

### **MINIMUM (Proves No Fake Audio):**
- ✅ You HEAR real human voice
- ✅ Voice says Carnot-related content
- ✅ Console shows Browser TTS logs
- ✅ NO "no supported source" errors

### **FULL SUCCESS (Everything Working):**
- ✅ All 5 visuals generate
- ✅ All 5 narrations speak
- ✅ Proper delays between visuals
- ✅ Clear, natural-sounding voice
- ✅ Content matches visuals
- ✅ Complete flow without errors

---

## 🚨 TROUBLESHOOTING

### **Problem: Backend won't start**
```bash
# Kill existing process
pkill -f "ts-node"

# Restart
cd /home/komail/LEAF/Learn-X/app/backend
npm run dev
```

### **Problem: Frontend won't start**
```bash
# Kill existing process
pkill -f "vite"

# Restart
cd /home/komail/LEAF/Learn-X/app/frontend
npm run dev
```

### **Problem: No sound in browser**
1. Check browser volume (not muted)
2. Check system volume
3. Try different browser (Chrome recommended)
4. Check browser console for TTS errors

### **Problem: "speechSynthesis not available"**
- Use modern browser (Chrome 33+, Firefox 49+, Safari 7+)
- Some browsers need HTTPS (localhost should work)
- Try different browser

---

## 📝 COPY-PASTE QUICK START

```bash
# Terminal 1: Backend
cd /home/komail/LEAF/Learn-X/app/backend && npm run dev

# Terminal 2: Frontend (in new terminal)
cd /home/komail/LEAF/Learn-X/app/frontend && npm run dev

# Then open browser:
# http://localhost:5173

# Type query:
# "teach me about the carnot engine"

# Expected: You HEAR speech about Carnot engine!
```

---

## 🎯 WHAT WE'RE PROVING

1. **NO FAKE AUDIO** - Browser TTS is REAL speech synthesis
2. **NO BACKEND TTS** - All TTS happens in browser (FREE)
3. **NO API KEYS NEEDED** - Browser does everything
4. **NO MOCK DATA** - Real narrations generated by backend
5. **NO SUGAR COATING** - Either works or it doesn't

**If you hear a voice speaking about the Carnot engine → COMPLETE SUCCESS!**

---

**Test Created:** October 15, 2025  
**Query:** "teach me about the carnot engine"  
**Expected Result:** REAL SPEECH from browser TTS  
**Status:** ⏳ **READY TO TEST - START SERVERS NOW!**
