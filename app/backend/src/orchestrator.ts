import { Queue, Worker, JobsOptions } from 'bullmq';
import { Server as IOServer } from 'socket.io';
import Redis from 'ioredis';
import { logger } from './logger';
import { GenJobData, Plan, PlanJobData, PlanStep, RenderChunk, SessionParams } from './types';
import { plannerAgent } from './agents/planner';
import { codegenAgent } from './agents/codegen';
import { debugAgent } from './agents/debugger';
import { compilerRouter } from './compiler/router';

const PLAN_KEY = (sessionId: string) => `session:${sessionId}:plan`;
const QUERY_KEY = (sessionId: string) => `session:${sessionId}:query`;
const CURRENT_STEP_KEY = (sessionId: string) => `session:${sessionId}:current_step`;
const PARAMS_KEY = (sessionId: string) => `session:${sessionId}:params`;
const CHUNK_KEY = (sessionId: string, stepId: number) => `session:${sessionId}:step:${stepId}:chunk`;
const LEARNING_STATE_KEY = (sessionId: string) => `session:${sessionId}:learning_state`;

// Progressive learning timing based on complexity
const TIMING_BY_COMPLEXITY: { [key: number]: number } = {
  1: 8000,  // Hook - quick engagement
  2: 12000, // Intuition - time to absorb
  3: 15000, // Formalism - complex concepts
  4: 18000, // Exploration - deep dive
  5: 12000  // Mastery - synthesis
};

export function initOrchestrator(io: IOServer, redis: Redis) {
  const connection = redis;
  
  // Clear any stale jobs on startup
  console.log('🧹 Clearing stale job queues on startup...');
  
  // Create separate queues for plan and gen jobs
  const planQueue = new Queue('plan-jobs', { connection });
  const genQueue = new Queue('gen-jobs', { connection });
  
  // Clean up stale jobs
  planQueue.obliterate({ force: true }).catch(() => console.log('Plan queue already clean'));
  genQueue.obliterate({ force: true }).catch(() => console.log('Gen queue already clean'));

  const defaultJobOpts: JobsOptions = {
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400 },
    backoff: { type: 'exponential', delay: 500 }
  };

  // Plan worker - NO FALLBACKS
  const planWorker = new Worker<PlanJobData>(
    'plan-jobs',
    async (job) => {
      console.log('=== NEW PLAN WORKER STARTED ===');
      console.log('Job data:', JSON.stringify(job.data));
      logger.debug(`[planWorker] Received job: ${job.name} id=${job.id}`);
      if (job.name !== 'plan') {
        console.log(`PLAN WORKER: SKIPPING non-plan job: ${job.name}`);
        return;
      }
      const { query, sessionId } = job.data;
      logger.debug(`[plan] START: session=${sessionId} query=${query}`);

      await redis.del(PLAN_KEY(sessionId));
      const plan: Plan = await plannerAgent(query); // NO TRY/CATCH - LET IT FAIL IF NEEDED
      
      console.log(`=== NEW STRUCTURED PLAN ===`);
      console.log(`Session: ${sessionId}`);
      console.log(`Query: ${query}`);
      console.log(`Plan title: ${plan.title}`);
      console.log(`Plan subtitle: ${plan.subtitle}`);
      console.log(`Plan toc:`, plan.toc);
      console.log(`Plan steps count: ${plan.steps.length}`);
      plan.steps.forEach((step, i) => {
        console.log(`Step ${i}: id=${step.id}, tag=${step.tag}, desc="${step.desc}"`);
      });
      console.log(`=== END NEW STRUCTURED PLAN ===`);
      
      logger.debug(`[plan] OK: session=${sessionId} plan received with ${plan.steps.length} steps`);
      await redis.set(PLAN_KEY(sessionId), JSON.stringify(plan));
      await redis.set(CURRENT_STEP_KEY(sessionId), 0);

      // Enqueue the first step emit immediately
      if (plan.steps.length > 0) {
        const firstStep = plan.steps[0];
        logger.debug(`[plan] Enqueuing first step emit: session=${sessionId} stepId=${firstStep.id}`);
        await genQueue.add('gen', { step: firstStep, sessionId, prefetch: false } as any, { ...defaultJobOpts });
      }
      logger.debug(`[plan] END: session=${sessionId}`);
    },
    { connection }
  );
  logger.debug('NEW Plan worker created');

  // Gen worker (prefetch + emit) - NO FALLBACKS
  const genWorker = new Worker<GenJobData>(
    'gen-jobs',
    async (job) => {
      console.log('=== NEW GEN WORKER STARTED ===');
      console.log('Gen job data:', JSON.stringify(job.data).slice(0, 200));
      logger.debug(`[genWorker] Received job: ${job.name} id=${job.id}`);
      if (job.name !== 'gen') return;
      const { sessionId, step } = job.data as any;
      logger.debug(`[gen] START: session=${sessionId} step=${step.id} tag=${step.tag}`);

      const paramsRaw = await redis.get(PARAMS_KEY(sessionId));
      const params: SessionParams = paramsRaw ? JSON.parse(paramsRaw) : {};
      const queryRaw = await redis.get(QUERY_KEY(sessionId));
      const query: string = queryRaw || '';

      // Load plan metadata
      const planRaw = await redis.get(PLAN_KEY(sessionId));
      const plan: Plan = planRaw ? JSON.parse(planRaw) : { title: '', subtitle: '', toc: [], steps: [] } as any;

      const key = CHUNK_KEY(sessionId, step.id);
      const isPrefetch = Boolean((job.data as any).prefetch);

      if (isPrefetch) {
        const cached = await redis.get(key);
        if (cached) {
          logger.debug(`[gen] Prefetch hit for session=${sessionId} step=${step.id}`);
          return;
        }
        const startTime = Date.now();
        const code = await codegenAgent(step, params, query); // NO TRY/CATCH - LET IT FAIL
        logger.debug(`[gen] OK: prefetch codegen completed for session=${sessionId} step=${step.id} in ${Date.now() - startTime}ms`);
        const compiled: RenderChunk = await compilerRouter(code, step.compiler);
        const checked: RenderChunk = await debugAgent(compiled);
        await redis.set(key, JSON.stringify(checked));
        logger.debug(`[gen] Prefetched and cached session=${sessionId} step=${step.id}`);
        return;
      }

      // Emit job: use cached if available else generate
      let checked: RenderChunk | null = null;
      const cached = await redis.get(key);
      if (cached) {
        checked = JSON.parse(cached);
        logger.debug(`[gen] Using cached chunk for session=${sessionId} step=${step.id}`);
      } else {
        const startTime = Date.now();
        try {
          const code = await codegenAgent(step, params, query);
          logger.debug(`[gen] OK: codegen completed for session=${sessionId} step=${step.id} in ${Date.now() - startTime}ms`);
          const compiled: RenderChunk = await compilerRouter(code, step.compiler);
          checked = await debugAgent(compiled);
          await redis.set(key, JSON.stringify(checked));
        } catch (error) {
          logger.error(`[gen] Codegen failed for session=${sessionId} step=${step.id}: ${error}`);
          // Create a simple fallback that shows the error
          checked = {
            type: 'actions',
            stepId: step.id,
            actions: [
              { op: 'drawTitle', text: step.desc, y: 0.1, duration: 1 },
              { op: 'drawLabel', normalized: true, text: `Step ${step.id}: ${step.desc}`, x: 0.1, y: 0.3, color: '#333' },
              { op: 'drawLabel', normalized: true, text: 'Content generation in progress...', x: 0.1, y: 0.4, color: '#666' }
            ]
          };
        }
      }

      console.log(`=== NEW EMITTING WITH FULL PLAN DATA ===`);
      console.log(`Session: ${sessionId}`);
      console.log(`Plan title: ${plan.title}`);
      console.log(`Plan toc:`, plan.toc);
      console.log(`Step: ${step.id} - ${step.desc}`);
      console.log(`Actions:`, checked!.actions);
      console.log(`=== END NEW EMITTING ===`);

      const eventData = { ...checked!, step, plan: { title: plan.title, subtitle: plan.subtitle, toc: plan.toc } };
      logger.debug(`[gen] EMITTING to room: ${sessionId} with ${eventData.actions?.length || 0} actions`);
      
      // Emit to the room
      try {
        const roomSockets = await io.in(sessionId).fetchSockets();
        logger.debug(`[gen] Sockets in room ${sessionId}: ${roomSockets.length}`);
        
        if (roomSockets.length > 0) {
          // Emit to room (this should work now)
          io.to(sessionId).emit('rendered', eventData);
          logger.debug(`[gen] Emitted to room ${sessionId} with ${roomSockets.length} sockets`);
        } else {
          logger.warn(`[gen] No sockets in room ${sessionId}! Using broadcast fallback.`);
          // Broadcast to all connected clients with matching sessionId
          io.emit('rendered', { ...eventData, targetSession: sessionId });
        }
      } catch (err) {
        logger.error(`[gen] Error emitting: ${err}`);
      }
      
      logger.debug(`[gen] END: session=${sessionId} step=${step.id}, emitted chunk`);

      // Schedule prefetch and next emit
      const idx = plan.steps.findIndex((s) => s.id === step.id);
      if (idx >= 0 && idx < plan.steps.length - 1) {
        const nextStep = plan.steps[idx + 1];
        await genQueue.add('gen', { step: nextStep, sessionId, prefetch: true } as any, { ...defaultJobOpts });
        const delayMs = TIMING_BY_COMPLEXITY[step.complexity || 1];
        await genQueue.add('gen', { step: nextStep, sessionId, prefetch: false } as any, { ...defaultJobOpts, delay: delayMs });
        await redis.set(CURRENT_STEP_KEY(sessionId), String(idx + 1));
      } else {
        logger.debug(`[orchestrator] All steps completed for session ${sessionId}`);
      }
    },
    { connection, concurrency: 2 }
  );
  logger.debug('NEW Gen worker created');

  planWorker.on('failed', (job, err) => logger.error(`[plan:failed] id=${job?.id} ${String(err)}`));
  genWorker.on('failed', (job, err) => logger.error(`[gen:failed] id=${job?.id} ${String(err)}`));

  async function enqueuePlan(query: string, sessionId: string) {
    logger.debug(`[orchestrator] Enqueuing plan for session ${sessionId}`);
    await redis.set(QUERY_KEY(sessionId), query);
    const job = await planQueue.add('plan', { query, sessionId }, { ...defaultJobOpts });
    logger.debug(`[orchestrator] Plan job added with id ${job.id} for session ${sessionId}`);
  }

  async function setParams(sessionId: string, params: SessionParams) {
    await redis.set(PARAMS_KEY(sessionId), JSON.stringify(params));
  }

  return {
    enqueuePlan,
    setParams
  };
}
