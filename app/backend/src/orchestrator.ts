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
const PARAMS_KEY = (sessionId: string) => `session:${sessionId}:params`;
const QUERY_KEY = (sessionId: string) => `session:${sessionId}:query`;
const CURRENT_STEP_KEY = (sessionId: string) => `session:${sessionId}:current_step`;

export function initOrchestrator(io: IOServer, redis: Redis) {
  const connection = redis;
  const taskQueue = new Queue('tasks', { connection });

  const defaultJobOpts: JobsOptions = {
    attempts: 2,
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400 },
    backoff: { type: 'exponential', delay: 500 }
  };

  // Plan worker
  const planWorker = new Worker<PlanJobData>(
    'tasks',
    async (job) => {
      if (job.name !== 'plan') return;
      const { query, sessionId } = job.data;
      logger.debug(`[plan] START: session=${sessionId} query=${query}`);

      const plan: Plan = await plannerAgent(query);
      logger.debug(`[plan] OK: session=${sessionId} plan received with ${plan.steps.length} steps`);
      await redis.set(PLAN_KEY(sessionId), JSON.stringify(plan));
      await redis.set(QUERY_KEY(sessionId), query);
      await redis.set(CURRENT_STEP_KEY(sessionId), 0);

      // Enqueue the first step
      if (plan.steps.length > 0) {
        const firstStep = plan.steps[0];
        logger.debug(`[plan] Enqueuing first step: session=${sessionId} stepId=${firstStep.id}`);
        await taskQueue.add('gen', { step: firstStep, sessionId, plan }, { ...defaultJobOpts });
      }
      logger.debug(`[plan] END: session=${sessionId}`);
    },
    { connection }
  );

  // Gen worker (now sequential)
  const genWorker = new Worker<GenJobData>(
    'tasks',
    async (job) => {
      if (job.name !== 'gen') return;
      const { sessionId, step, plan } = job.data;
      logger.debug(`[gen] START: session=${sessionId} step=${step.id} tag=${step.tag}`);

      const paramsRaw = await redis.get(PARAMS_KEY(sessionId));
      const params: SessionParams = paramsRaw ? JSON.parse(paramsRaw) : {};
      const queryRaw = await redis.get(QUERY_KEY(sessionId));
      const query: string = queryRaw || '';

      // Codegen -> Compile -> Debug
      const code = await codegenAgent(step, params, query);
      logger.debug(`[gen] OK: codegen completed for session=${sessionId} step=${step.id}`);
      const compiled: RenderChunk = await compilerRouter(code, step.compiler);
      logger.debug(`[gen] OK: compiler completed for session=${sessionId} step=${step.id}`);
      const checked: RenderChunk = await debugAgent(compiled);
      logger.debug(`[gen] OK: debugger completed for session=${sessionId} step=${step.id}`);

      // Include minimal plan metadata so the frontend can display a lesson title
      io.to(sessionId).emit('rendered', { ...checked, step, plan: { title: plan.title } });
      logger.debug(`[gen] END: session=${sessionId} step=${step.id}, emitted 'rendered' event`);
    },
    { connection, concurrency: 1 } // Ensure sequential processing
  );

  planWorker.on('failed', (job, err) => logger.debug(`[plan:failed] id=${job?.id} ${String(err)}`));
  genWorker.on('failed', (job, err) => logger.debug(`[gen:failed] id=${job?.id} ${String(err)}`));

  async function enqueuePlan(query: string, sessionId: string) {
    await taskQueue.add('plan', { query, sessionId }, { ...defaultJobOpts });
  }

  async function triggerNextStep(sessionId: string) {
    logger.debug(`[orchestrator] triggerNextStep called for session ${sessionId}`);
    const currentStepIndex = parseInt((await redis.get(CURRENT_STEP_KEY(sessionId))) || '0', 10);
    const nextStepIndex = currentStepIndex + 1;

    // Retry a few times in case the plan write hasn't completed yet (race protection)
    let planRaw: string | null = null;
    for (let i = 0; i < 5; i++) {
      planRaw = await redis.get(PLAN_KEY(sessionId));
      if (planRaw) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!planRaw) {
      logger.debug(`[orchestrator] No plan found for session ${sessionId} to trigger next step (after retries).`);
      return;
    }
    const plan: Plan = JSON.parse(planRaw);
    if (nextStepIndex < plan.steps.length) {
      await redis.set(CURRENT_STEP_KEY(sessionId), nextStepIndex);
      const nextStep = plan.steps[nextStepIndex];
      logger.debug(`[orchestrator] Enqueuing next step: session=${sessionId} stepId=${nextStep.id}`);
      await taskQueue.add('gen', { step: nextStep, sessionId, plan }, { ...defaultJobOpts });
    } else {
      logger.debug(`[orchestrator] All steps completed for session ${sessionId}`);
    }
  }

  async function setParams(sessionId: string, params: SessionParams) {
    await redis.set(PARAMS_KEY(sessionId), JSON.stringify(params));
  }

  return {
    enqueuePlan,
    setParams,
    triggerNextStep
  };
}
