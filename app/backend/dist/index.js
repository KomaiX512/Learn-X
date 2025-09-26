"use strict";
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
        cors: { origin: FRONTEND_URLS, methods: ['GET', 'POST'] }
    });
    const redis = new ioredis_1.default(REDIS_URL, { maxRetriesPerRequest: null });
    const orchestrator = (0, orchestrator_1.initOrchestrator)(io, redis);
    io.on('connection', (socket) => {
        socket.on('join', ({ sessionId }) => {
            if (sessionId) {
                socket.join(sessionId);
                logger_1.logger.debug(`socket joined session ${sessionId}`);
                // Acknowledge to the client that it successfully joined the room
                socket.emit('joined', { sessionId });
            }
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
        logger_1.logger.debug(`[api] Received request on /api/session/${sessionId}/next`);
        await orchestrator.triggerNextStep(sessionId);
        res.json({ ok: true });
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
