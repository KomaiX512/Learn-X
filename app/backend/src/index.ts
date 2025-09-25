import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as IOServer } from 'socket.io';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { initOrchestrator } from './orchestrator';
import { SessionParams } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const PORT = Number(process.env.PORT || 3001);
const FRONTEND_URLS = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((s) => s.trim());
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function main() {
  const app = express();
  app.use(cors({ origin: FRONTEND_URLS, credentials: true }));
  app.use(express.json());

  const server = http.createServer(app);
  const io = new IOServer(server, {
    cors: { origin: FRONTEND_URLS, methods: ['GET', 'POST'] }
  });

  const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  const orchestrator = initOrchestrator(io, redis);

  io.on('connection', (socket) => {
    socket.on('join', ({ sessionId }) => {
      if (sessionId) {
        socket.join(sessionId);
        logger.debug(`socket joined session ${sessionId}`);
      }
    });
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true, env: { PORT, FRONTEND_URLS, REDIS_URL } });
  });

  app.post('/api/query', async (req, res) => {
    logger.debug('Received request on /api/query', { body: req.body });
    const { query, params, sessionId: clientSessionId } = req.body as { query: string; params?: SessionParams; sessionId?: string };
    if (!query) return res.status(400).json({ error: 'Missing query' });
    const sessionId = clientSessionId || uuidv4();
    if (params) {
      await orchestrator.setParams(sessionId, params);
    }
    await orchestrator.enqueuePlan(query, sessionId);
    res.json({ sessionId });
  });

  app.post('/api/session/:id/params', async (req, res) => {
    const sessionId = req.params.id;
    const params = req.body as SessionParams;
    await orchestrator.setParams(sessionId, params);
    res.json({ ok: true });
  });

  app.post('/api/session/:id/next', async (req, res) => {
    const sessionId = req.params.id;
    logger.debug(`[api] Received request on /api/session/${sessionId}/next`);
    await orchestrator.triggerNextStep(sessionId);
    res.json({ ok: true });
  });

  // Gemini verification endpoint (optional)
  app.get('/api/gemini-test', async (_req, res) => {
    try {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return res.status(400).json({ error: 'Missing GEMINI_API_KEY' });
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent('Test: Say hello');
      res.json({ text: result.response.text() });
    } catch (err: any) {
      res.status(500).json({ error: String(err) });
    }
  });

  server.listen(PORT, () => {
    logger.debug(`Backend listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  logger.debug(`Fatal: ${String(err)}`);
  process.exit(1);
});
