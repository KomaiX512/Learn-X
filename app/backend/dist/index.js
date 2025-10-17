"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const ioredis_1 = __importDefault(require("ioredis"));
const uuid_1 = require("uuid");
const logger_1 = require("./logger");
const orchestrator_1 = require("./orchestrator");
const generative_ai_1 = require("@google/generative-ai");
const PORT = Number(process.env.PORT || 3001);
const DEFAULT_FE_URLS = 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,https://2a683f5cb9a7.ngrok-free.app';
const FRONTEND_URLS = (process.env.FRONTEND_URL || DEFAULT_FE_URLS)
    .split(',')
    .map((s) => s.trim());
const EXPANDED_FE_URLS = Array.from(new Set(FRONTEND_URLS.flatMap((u) => {
    try {
        const url = new URL(u);
        const variants = [u];
        if (url.hostname === 'localhost') {
            variants.push(`${url.protocol}//127.0.0.1:${url.port}`);
        }
        else if (url.hostname === '127.0.0.1') {
            variants.push(`${url.protocol}//localhost:${url.port}`);
        }
        return variants;
    }
    catch {
        return [u];
    }
})));
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
async function main() {
    // ═══════════════════════════════════════════════════════════
    // BACKEND STARTUP - PRODUCTION MONITORING
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(70));
    console.log('🚀 LEARN-X BACKEND STARTING');
    console.log('═'.repeat(70));
    console.log('📍 Configuration:');
    console.log('   PORT:', PORT);
    console.log('   FRONTEND_URLS:', EXPANDED_FE_URLS.join(', '));
    console.log('   REDIS_URL:', REDIS_URL);
    console.log('   GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ SET' : '❌ MISSING');
    console.log('   USE_VISUAL_VERSION:', process.env.USE_VISUAL_VERSION || 'v3 (default)');
    console.log('   LOG_LEVEL:', process.env.LOG_LEVEL || 'info');
    console.log('\n📊 TTS Configuration:');
    console.log('   TTS_ENABLED:', process.env.TTS_ENABLED || 'false');
    console.log('   TTS_API_KEY:', process.env.GOOGLE_CLOUD_TTS_API_KEY ? '✅ SET' : '❌ MISSING');
    console.log('   TTS_VOICE:', process.env.TTS_VOICE_NAME || 'en-US-Journey-D');
    console.log('   TTS_INTER_VISUAL_DELAY:', process.env.TTS_INTER_VISUAL_DELAY || '2000ms');
    console.log('═'.repeat(70) + '\n');
    const app = (0, express_1.default)();
    const corsOptions = {
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (EXPANDED_FE_URLS.includes(origin))
                return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        preflightContinue: false,
        optionsSuccessStatus: 204
    };
    app.use((0, cors_1.default)(corsOptions));
    // Increase payload limit for screenshot uploads (default is 100kb)
    app.use(express_1.default.json({ limit: '10mb' })); // Allow up to 10MB for screenshots
    app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
    const server = http_1.default.createServer(app);
    const io = new socket_io_1.Server(server, {
        cors: { origin: EXPANDED_FE_URLS, methods: ['GET', 'POST'] },
        // Keep connections alive
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling']
    });
    console.log('🔌 Connecting to Redis...');
    const redis = new ioredis_1.default(REDIS_URL, { maxRetriesPerRequest: null });
    // Initialize TTS service and test connection
    console.log('🎤 Initializing Text-to-Speech service...');
    const { ttsService } = await Promise.resolve().then(() => __importStar(require('./services/tts-service')));
    if (ttsService.isAvailable()) {
        console.log('✅ TTS service initialized');
        // Optionally test connection on startup
        const testSuccess = await ttsService.testConnection();
        if (testSuccess) {
            console.log('✅ TTS connection test successful');
        }
        else {
            console.warn('⚠️  TTS connection test failed - audio narration may not work');
        }
    }
    else {
        console.log('⚠️  TTS service not available (check configuration)');
    }
    redis.on('connect', () => console.log('✅ Redis connected'));
    redis.on('error', (err) => console.error('❌ Redis error:', err.message));
    console.log('🎭 Initializing orchestrator...');
    const orchestrator = await (0, orchestrator_1.initOrchestrator)(io, redis);
    console.log('✅ Orchestrator initialized\n');
    io.on('connection', (socket) => {
        logger_1.logger.debug(`[socket] New connection: ${socket.id}`);
        socket.on('join', async (data) => {
            // Handle both string and object formats
            const sessionId = typeof data === 'string' ? data : data?.sessionId;
            if (sessionId) {
                socket.join(sessionId);
                logger_1.logger.debug(`[socket] Socket ${socket.id} joined session ${sessionId}`);
                // Store session in socket data for delivery manager
                socket.data.sessionId = sessionId;
                // Verify the socket is in the room
                const rooms = Array.from(socket.rooms);
                logger_1.logger.debug(`[socket] Socket ${socket.id} is now in rooms: ${rooms.join(', ')}`);
                // Acknowledge to the client that it successfully joined the room
                socket.emit('joined', { sessionId });
                // Check if there's already a plan and steps generated for this session
                try {
                    const planKey = `session:${sessionId}:plan`;
                    const planData = await redis.get(planKey);
                    if (planData) {
                        const plan = JSON.parse(planData);
                        // Emit the plan immediately to the newly joined socket
                        socket.emit('plan', {
                            title: plan.title,
                            subtitle: plan.subtitle,
                            toc: plan.toc,
                            steps: plan.steps.map(s => ({ id: s.id, tag: s.tag, desc: s.desc }))
                        });
                        logger_1.logger.debug(`[socket] Sent cached plan to newly joined socket ${socket.id}`);
                        // Check for any generated steps and emit them
                        for (const step of plan.steps) {
                            const chunkKey = `session:${sessionId}:step:${step.id}:chunk`;
                            const chunkData = await redis.get(chunkKey);
                            if (chunkData) {
                                const chunk = JSON.parse(chunkData);
                                socket.emit('rendered', {
                                    ...chunk,
                                    step,
                                    plan: { title: plan.title, subtitle: plan.subtitle, toc: plan.toc }
                                });
                                logger_1.logger.debug(`[socket] Sent cached step ${step.id} to newly joined socket ${socket.id}`);
                            }
                        }
                    }
                }
                catch (error) {
                    logger_1.logger.error(`[socket] Error checking for cached data: ${error}`);
                }
            }
        });
        // Add acknowledgment handler
        socket.on('step-received', (data) => {
            const { sessionId, stepId } = data;
            logger_1.logger.debug(`[socket] Client acknowledged step ${stepId} for session ${sessionId}`);
        });
        // Keep-alive handler
        socket.on('ping', () => {
            socket.emit('pong');
        });
        socket.on('disconnect', (reason) => {
            logger_1.logger.debug(`[socket] Socket ${socket.id} disconnected: ${reason}`);
        });
    });
    app.get('/health', (_req, res) => {
        res.json({
            ok: true,
            env: {
                PORT,
                FRONTEND_URLS: EXPANDED_FE_URLS,
                REDIS_URL,
                GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '***' : undefined,
                LOG_LEVEL: process.env.LOG_LEVEL,
                LLM_TIMEOUT_MS: process.env.LLM_TIMEOUT_MS
            }
        });
    });
    app.post('/api/query', async (req, res) => {
        logger_1.logger.debug('Received request on /api/query', { body: req.body });
        const { query, params, sessionId: clientSessionId, difficulty } = req.body;
        if (!query)
            return res.status(400).json({ error: 'Missing query' });
        const sessionId = clientSessionId || (0, uuid_1.v4)();
        // Store query in Redis for clarification endpoint
        const queryKey = `session:${sessionId}:query`;
        await redis.set(queryKey, query);
        logger_1.logger.debug(`[api] Stored query for session ${sessionId}: "${query}" (difficulty: ${difficulty || 'hard'})`);
        if (params) {
            await orchestrator.setParams(sessionId, params);
        }
        await orchestrator.enqueuePlan(query, sessionId, difficulty);
        res.json({ sessionId });
    });
    app.post('/api/session/:id/params', async (req, res) => {
        const sessionId = req.params.id;
        const params = req.body;
        await orchestrator.setParams(sessionId, params);
        res.json({ ok: true });
    });
    app.post('/api/session/:id/next', async (req, res) => {
        const sessionId = req.params.id;
        logger_1.logger.debug(`[api] Received request on /api/session/${sessionId}/next - automatic progression is enabled`);
        // Automatic progression is now handled by the orchestrator
        // This endpoint is kept for backward compatibility but doesn't need to do anything
        res.json({ ok: true, message: 'Automatic progression is enabled' });
    });
    // Monitoring & Management Endpoints
    app.get('/api/performance', async (_req, res) => {
        try {
            const report = orchestrator.getPerformanceReport();
            res.type('text/plain').send(report);
        }
        catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });
    app.get('/api/cache/stats', async (_req, res) => {
        try {
            const stats = await orchestrator.getCacheStats();
            res.json(stats);
        }
        catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });
    app.post('/api/cache/clear', async (_req, res) => {
        try {
            await orchestrator.clearCache();
            res.json({ success: true, message: 'Cache cleared successfully' });
        }
        catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });
    // Gemini verification endpoint (optional)
    app.get('/api/gemini-test', async (_req, res) => {
        try {
            const key = process.env.GEMINI_API_KEY;
            if (!key)
                return res.status(400).json({ error: 'Missing GEMINI_API_KEY' });
            const genAI = new generative_ai_1.GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent('Test: Say hello');
            res.json({ text: result.response.text() });
        }
        catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });
    // Audio serving endpoint - stream audio files
    app.get('/audio/:filename', (req, res) => {
        const { filename } = req.params;
        const audioPath = `${process.cwd()}/audio-output/${filename}`;
        // Security: only allow MP3 files and prevent directory traversal
        if (!filename.endsWith('.mp3') || filename.includes('..')) {
            return res.status(400).json({ error: 'Invalid filename' });
        }
        res.sendFile(audioPath, (err) => {
            if (err) {
                logger_1.logger.error(`[audio] Failed to serve ${filename}: ${err.message}`);
                res.status(404).json({ error: 'Audio file not found' });
            }
        });
    });
    // Clarification endpoint - student asks question during lecture
    app.post('/api/clarify', async (req, res) => {
        try {
            const { sessionId, question, screenshot, stepContext } = req.body;
            if (!sessionId || !question) {
                return res.status(400).json({ error: 'Missing sessionId or question' });
            }
            logger_1.logger.info(`[api] Clarification request for session ${sessionId}: "${question}"`);
            logger_1.logger.debug(`[api] Step context:`, stepContext);
            // Retrieve context from Redis
            const planKey = `session:${sessionId}:plan`;
            const queryKey = `session:${sessionId}:query`;
            const [planData, query] = await Promise.all([
                redis.get(planKey),
                redis.get(queryKey)
            ]);
            if (!planData) {
                return res.status(404).json({ error: 'Session not found or plan not available' });
            }
            const plan = JSON.parse(planData);
            // Use step context from frontend or fallback to first step
            const currentStep = stepContext ? {
                id: stepContext.stepId || 0,
                tag: stepContext.stepTag || 'Current Step',
                desc: stepContext.stepDesc || 'Learning step',
                complexity: 3
            } : plan.steps[0];
            // Import clarifier agent
            const { clarifierAgent } = await Promise.resolve().then(() => __importStar(require('./agents/clarifier')));
            // Generate clarification
            const clarification = await clarifierAgent({
                query: query || 'Unknown topic',
                step: currentStep,
                question,
                screenshot,
                plan
            });
            logger_1.logger.info(`[api] Clarification generated: ${clarification.actions.length} actions`);
            // Generate visual-focused narration for the clarification
            logger_1.logger.info(`[api] Generating narration for clarification...`);
            let narrationData = null;
            try {
                const { generateClarificationNarration } = await Promise.resolve().then(() => __importStar(require('./agents/narrationGenerator')));
                const narration = await generateClarificationNarration({
                    question,
                    svgActions: clarification.actions,
                    topic: query || 'Unknown topic',
                    stepContext: currentStep.desc
                });
                narrationData = {
                    text: narration.narration,
                    duration: narration.duration,
                    wordCount: narration.wordCount
                };
                logger_1.logger.info(`[api] ✅ Narration generated: ${narration.wordCount} words, ${narration.duration}s duration`);
            }
            catch (narrationError) {
                logger_1.logger.warn(`[api] ⚠️ Narration generation failed (non-critical): ${narrationError.message}`);
                // Continue without narration - it's optional
            }
            // Create a unique step ID for this clarification
            const clarificationStepId = `Q&A-${Date.now()}`;
            // Check how many sockets are in the room
            const socketsInRoom = await io.in(sessionId).fetchSockets();
            logger_1.logger.info(`[api] Emitting clarification to session ${sessionId} (${socketsInRoom.length} sockets)`);
            // Emit clarification as a special step that can be inserted inline
            const clarificationData = {
                type: 'clarification',
                stepId: clarificationStepId,
                title: clarification.title,
                explanation: clarification.explanation,
                actions: clarification.actions,
                narration: narrationData, // NEW: Include visual-focused narration
                question,
                insertAfterScroll: stepContext?.scrollY || 0,
                timestamp: Date.now()
            };
            io.to(sessionId).emit('clarification', clarificationData);
            logger_1.logger.info(`[api] ✅ Clarification emitted successfully`);
            logger_1.logger.debug(`[api] Clarification data:`, {
                stepId: clarificationStepId,
                actionsCount: clarification.actions.length,
                hasTitle: !!clarification.title
            });
            res.json({
                success: true,
                clarification: {
                    type: 'clarification',
                    stepId: clarificationStepId,
                    title: clarification.title,
                    explanation: clarification.explanation,
                    actions: clarification.actions,
                    narration: narrationData, // Include narration in response
                    insertAfterScroll: stepContext?.scrollY || 0
                }
            });
        }
        catch (err) {
            logger_1.logger.error(`[api] Error in clarification: ${err}`);
            res.status(500).json({ error: String(err) });
        }
    });
    // Key Notes Generator endpoint - works with ANY amount of available context
    app.post('/api/generate-notes', async (req, res) => {
        try {
            const { sessionId } = req.body;
            if (!sessionId) {
                return res.status(400).json({ error: 'Missing sessionId' });
            }
            logger_1.logger.info(`[api] Key notes generation request for session ${sessionId}`);
            // Retrieve lecture context from Redis (whatever is available)
            const planKey = `session:${sessionId}:plan`;
            const queryKey = `session:${sessionId}:query`;
            const [planData, query] = await Promise.all([
                redis.get(planKey),
                redis.get(queryKey)
            ]);
            if (!planData) {
                return res.status(404).json({ error: 'Session not found or plan not available' });
            }
            const plan = JSON.parse(planData);
            // Gather ALL AVAILABLE lecture content (may be partial if lecture is ongoing)
            const stepContents = await Promise.all(plan.steps.map(async (step) => {
                const chunkKey = `session:${sessionId}:step:${step.id}:chunk`;
                const chunkData = await redis.get(chunkKey);
                if (chunkData) {
                    const chunk = JSON.parse(chunkData);
                    return {
                        stepId: step.id,
                        title: step.desc || step.tag,
                        transcript: chunk.transcript || '',
                        actions: chunk.actions || [],
                        complexity: step.complexity || 3,
                        isAvailable: true // Mark as rendered
                    };
                }
                return {
                    stepId: step.id,
                    title: step.desc || step.tag,
                    transcript: '',
                    actions: [],
                    complexity: step.complexity || 3,
                    isAvailable: false // Not rendered yet
                };
            }));
            const availableSteps = stepContents.filter(s => s.isAvailable).length;
            const totalSteps = stepContents.length;
            const transcriptLength = stepContents.reduce((sum, s) => sum + (s.transcript?.length || 0), 0);
            logger_1.logger.info(`[api] Context: ${availableSteps}/${totalSteps} steps available, ${transcriptLength} chars of transcript`);
            // Import notes generator agent
            const { generateKeyNotes } = await Promise.resolve().then(() => __importStar(require('./agents/notesGenerator')));
            // Generate key notes with AVAILABLE context + fill in missing important points
            const notesResult = await generateKeyNotes(query || 'Unknown topic', plan.subtitle, plan.steps, stepContents, // Pass all step contents (some may be empty)
            availableSteps < totalSteps // Flag if lecture is incomplete
            );
            logger_1.logger.info(`[api] Key notes generated: ${notesResult.notes.length} categories, ${notesResult.notes.reduce((sum, cat) => sum + cat.items.length, 0)} total items (${availableSteps}/${totalSteps} steps used)`);
            res.json({
                success: true,
                notes: notesResult.notes,
                metadata: {
                    stepsAvailable: availableSteps,
                    stepsTotal: totalSteps,
                    isPartial: availableSteps < totalSteps
                }
            });
        }
        catch (err) {
            logger_1.logger.error(`[api] Error in key notes generation: ${err}`);
            res.status(500).json({ error: String(err) });
        }
    });
    server.listen(PORT, '0.0.0.0', () => {
        console.log('\n' + '═'.repeat(70));
        console.log('✅ SERVER READY');
        console.log('═'.repeat(70));
        console.log('🌐 Backend URL: http://127.0.0.1:' + PORT);
        console.log('🔗 Health Check: http://127.0.0.1:' + PORT + '/health');
        console.log('📡 WebSocket Ready: ws://127.0.0.1:' + PORT);
        console.log('═'.repeat(70) + '\n');
        logger_1.logger.debug(`Server listening on 0.0.0.0:${PORT} (accessible via 127.0.0.1:${PORT})`);
    });
    const shutdown = () => {
        logger_1.logger.debug('Shutting down server...');
        server.close(() => {
            logger_1.logger.debug('Server shut down.');
            process.exit(0);
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
main().catch((err) => {
    logger_1.logger.debug(`Fatal: ${String(err)}`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map