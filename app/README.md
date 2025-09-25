# Universal Interactive Learning Engine (MVP)

End-to-end MVP with:
- Backend: Node 22, Express 5, Socket.io, BullMQ 6, Redis 7, Gemini SDK (@google/generative-ai), LangChain.js, Winston, vm2
- Frontend: React + Vite, Konva, Socket.io-client, MathJax
- Shared: Prompt templates and schemas (Zod)

## Quick Start

1) Start Redis
   docker compose -f app/docker-compose.yml up -d

2) Backend setup
   cd app/backend
   npm install
   cp ../.env.example .env
   # Put your GEMINI_API_KEY in .env
   npm run dev

3) Frontend setup
   cd app/frontend
   npm install
   npm run dev

Open http://localhost:5174

## Demo Query
"Visualize the charging of an RC circuit and annotate the time constant."
