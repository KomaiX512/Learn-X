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
const FRONTEND_URLS = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((s) => s.trim());
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
async function main() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({ origin: FRONTEND_URLS, credentials: true }));
    app.use(express_1.default.json());
    const server = http_1.default.createServer(app);
    const io = new socket_io_1.Server(server, {
        cors: { origin: FRONTEND_URLS, methods: ['GET', 'POST'] },
        // Keep connections alive
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling']
    });
    const redis = new ioredis_1.default(REDIS_URL, { maxRetriesPerRequest: null });
    const orchestrator = await (0, orchestrator_1.initOrchestrator)(io, redis);
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
                FRONTEND_URLS,
                REDIS_URL,
                GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '***' : undefined,
                LOG_LEVEL: process.env.LOG_LEVEL,
                LLM_TIMEOUT_MS: process.env.LLM_TIMEOUT_MS
            }
        });
    });
    app.post('/api/query', async (req, res) => {
        logger_1.logger.debug('Received request on /api/query', { body: req.body });
        const { query, params, sessionId: clientSessionId } = req.body;
        if (!query)
            return res.status(400).json({ error: 'Missing query' });
        const sessionId = clientSessionId || (0, uuid_1.v4)();
        // Store query in Redis for clarification endpoint
        const queryKey = `session:${sessionId}:query`;
        await redis.set(queryKey, query);
        logger_1.logger.debug(`[api] Stored query for session ${sessionId}: "${query}"`);
        if (params) {
            await orchestrator.setParams(sessionId, params);
        }
        await orchestrator.enqueuePlan(query, sessionId);
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
    // Clarification endpoint - student asks question during lecture
    app.post('/api/clarify', async (req, res) => {
        try {
            const { sessionId, question, screenshot } = req.body;
            if (!sessionId || !question) {
                return res.status(400).json({ error: 'Missing sessionId or question' });
            }
            logger_1.logger.info(`[api] Clarification request for session ${sessionId}: "${question}"`);
            // Retrieve context from Redis
            const planKey = `session:${sessionId}:plan`;
            const currentStepKey = `session:${sessionId}:current_step`;
            const [planData, currentStepIndex] = await Promise.all([
                redis.get(planKey),
                redis.get(currentStepKey)
            ]);
            if (!planData) {
                return res.status(404).json({ error: 'Session not found or plan not available' });
            }
            const plan = JSON.parse(planData);
            const stepIndex = parseInt(currentStepIndex || '0', 10);
            const currentStep = plan.steps[stepIndex];
            if (!currentStep) {
                return res.status(404).json({ error: 'Current step not found' });
            }
            // Get query from session
            const queryKey = `session:${sessionId}:query`;
            const query = await redis.get(queryKey) || 'Unknown topic';
            // Import clarifier agent
            const { clarifierAgent } = await Promise.resolve().then(() => __importStar(require('./agents/clarifier')));
            // Generate clarification
            const clarification = await clarifierAgent({
                query,
                step: currentStep,
                question,
                screenshot,
                plan
            });
            logger_1.logger.info(`[api] Clarification generated: ${clarification.actions.length} actions`);
            // Emit clarification to the session
            io.to(sessionId).emit('clarification', {
                type: 'clarification',
                title: clarification.title,
                explanation: clarification.explanation,
                actions: clarification.actions,
                question,
                stepId: `clarification-${Date.now()}`
            });
            res.json({
                success: true,
                clarification: {
                    title: clarification.title,
                    explanation: clarification.explanation,
                    actionsCount: clarification.actions.length
                }
            });
        }
        catch (err) {
            logger_1.logger.error(`[api] Error in clarification: ${err}`);
            res.status(500).json({ error: String(err) });
        }
    });
    server.listen(PORT, () => {
        logger_1.logger.debug(`Backend listening on http://localhost:${PORT}`);
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
