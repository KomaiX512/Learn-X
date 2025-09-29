import { Queue, Worker, Job, JobsOptions } from 'bullmq';
import { Server as IOServer } from 'socket.io';
import Redis from 'ioredis';
import { logger } from './logger';
import { plannerAgent } from './agents/planner';
import { codegenAgent } from './agents/codegen';
import { compilerRouter } from './compiler/router';
import { debugAgent } from './agents/debugger';
import { SessionParams, Plan, RenderChunk } from './types';
import { CacheManager } from './services/cache-manager';
import { PerformanceMonitor } from './services/performance-monitor';

type PlanJobData = { query: string; sessionId: string };
type GenJobData = { step: any; sessionId: string; prefetch?: boolean };

const PLAN_KEY = (sessionId: string) => `session:${sessionId}:plan`;
const QUERY_KEY = (sessionId: string) => `session:${sessionId}:query`;
const CURRENT_STEP_KEY = (sessionId: string) => `session:${sessionId}:current_step`;
const PARAMS_KEY = (sessionId: string) => `session:${sessionId}:params`;
const CHUNK_KEY = (sessionId: string, stepId: number) => `session:${sessionId}:step:${stepId}:chunk`;
const LEARNING_STATE_KEY = (sessionId: string) => `session:${sessionId}:learning_state`;

// Progressive learning timing based on complexity
// REDUCED for immediate delivery - content is already generated
const TIMING_BY_COMPLEXITY: { [key: number]: number } = {
  1: 2000,   // Hook - quick engagement
  2: 2500,   // Intuition - time to absorb
  3: 3000,   // Formalism - complex concepts
  4: 3500,   // Exploration - deep dive
  5: 3000    // Mastery - synthesis
};

export async function initOrchestrator(io: IOServer, redis: Redis) {
  // BullMQ requires separate Redis connections for queues and workers
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  
  // Create separate connections for BullMQ
  const queueConnection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  const workerConnection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  
  // Initialize services with original redis connection
  const cacheManager = new CacheManager(redis);
  const perfMonitor = new PerformanceMonitor();
  
  // Clear any stale jobs on startup
  console.log('🧹 Clearing stale job queues on startup...');
  
  // Create queues with queue connection
  const planQueue = new Queue('plan-jobs', { connection: queueConnection });
  const genQueue = new Queue('gen-jobs', { connection: queueConnection });
  const parallelQueue = new Queue('parallel-gen-jobs', { connection: queueConnection });
  
  // Clean up stale jobs ONLY on startup, not continuously
  // await planQueue.obliterate({ force: true }).catch(() => {});
  // await genQueue.obliterate({ force: true }).catch(() => {});
  // await parallelQueue.obliterate({ force: true }).catch(() => {});
  
  // Performance monitoring updates
  perfMonitor.on('metrics-updated', (metrics) => {
    logger.debug('[monitor] Metrics updated:', metrics.averageTotalTime + 'ms avg');
  });

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
      
      // Track request in performance monitor
      perfMonitor.startRequest(sessionId);
      perfMonitor.startPlanGeneration(sessionId);
      
      // Check cache first
      let plan: Plan | null = await cacheManager.getCachedPlan(query);
      
      if (plan) {
        logger.debug(`[plan] Using cached plan for query: ${query}`);
        perfMonitor.recordCacheHit();
        perfMonitor.endPlanGeneration(sessionId, true);
      } else {
        perfMonitor.recordCacheMiss();
        await redis.del(PLAN_KEY(sessionId));
        plan = await plannerAgent(query); // NO TRY/CATCH - LET IT FAIL IF NEEDED
        perfMonitor.endPlanGeneration(sessionId, true);
        
        // Cache the generated plan
        await cacheManager.cachePlan(query, plan);
      }
      
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

      // NEW: Enqueue parallel generation of ALL steps immediately
      if (plan.steps.length > 0) {
        logger.debug(`[plan] Enqueuing PARALLEL generation of all ${plan.steps.length} steps`);
        
        // Emit progress update
        io.to(sessionId).emit('status', {
          type: 'plan_ready',
          plan: { title: plan.title, subtitle: plan.subtitle, toc: plan.toc },
          totalSteps: plan.steps.length,
          message: 'Starting parallel generation of all steps...'
        });
        
        // Generate all steps in parallel
        await parallelQueue.add('parallel-generate', { 
          plan, 
          sessionId, 
          query 
        }, { ...defaultJobOpts });
      }
      logger.debug(`[plan] END: session=${sessionId}`);
    },
    { connection: workerConnection }
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
        const code = await codegenAgent(step, query); // NO TRY/CATCH - LET IT FAIL
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
          const code = await codegenAgent(step, query);
          logger.debug(`[gen] OK: codegen completed for session=${sessionId} step=${step.id} in ${Date.now() - startTime}ms`);
          const compiled: RenderChunk = await compilerRouter(code, step.compiler);
          checked = await debugAgent(compiled);
          await redis.set(key, JSON.stringify(checked));
        } catch (error) {
          logger.error(`[gen] CRITICAL FAILURE for session=${sessionId} step=${step.id}: ${error}`);
          // NO FALLBACKS - Let it fail properly
          throw new Error(`Generation failed for step ${step.id}: ${error}`);
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
        // Start prefetch immediately
        await genQueue.add('gen', { step: nextStep, sessionId, prefetch: true } as any, { ...defaultJobOpts });
        
        // CRITICAL FIX: Use nextStep's complexity, not current step's!
        const delayMs = TIMING_BY_COMPLEXITY[nextStep.complexity || 1];
        logger.debug(`[orchestrator] Scheduling step ${nextStep.id} emission with ${delayMs}ms delay (complexity ${nextStep.complexity})`);
        
        // Add extra buffer time to prevent race conditions with generation
        const bufferMs = nextStep.complexity >= 4 ? 5000 : 2000; // Extra time for complex steps
        await genQueue.add('gen', { step: nextStep, sessionId, prefetch: false } as any, { 
          ...defaultJobOpts, 
          delay: delayMs + bufferMs 
        });
        await redis.set(CURRENT_STEP_KEY(sessionId), String(idx + 1));
      } else {
        logger.debug(`[orchestrator] All steps completed for session ${sessionId}`);
      }
    },
    { connection: workerConnection, concurrency: 2 }
  );
  logger.debug('NEW Gen worker created');

  // NEW: Parallel generation worker - generates ALL steps simultaneously
  const parallelWorker = new Worker(
    'parallel-gen-jobs',
    async (job) => {
      console.log('=== PARALLEL WORKER CALLED ===');
      console.log('Job name:', job.name);
      console.log('Job data keys:', Object.keys(job.data || {}));
      
      if (job.name !== 'parallel-generate') {
        console.log('SKIPPING: Not a parallel-generate job');
        return;
      }
      const { sessionId, plan, query } = job.data as any;
      logger.debug(`[parallel] Starting parallel generation for ${plan.steps.length} steps`);
      
      const paramsRaw = await redis.get(PARAMS_KEY(sessionId));
      const params: SessionParams = paramsRaw ? JSON.parse(paramsRaw) : {};
      
      // Track generation progress
      const generationPromises: Promise<any>[] = [];
      const startTime = Date.now();
      
      // Generate all steps in parallel
      for (const step of plan.steps) {
        generationPromises.push(
          (async () => {
            const stepStartTime = Date.now();
            try {
              perfMonitor.startStepGeneration(sessionId, step.id);
              
              // Check cache first
              let checked = await cacheManager.getCachedChunk(query, step.id);
              
              if (checked) {
                logger.debug(`[parallel] Using cached chunk for step ${step.id}`);
                perfMonitor.recordCacheHit();
                
                // Still cache it in session-specific key for quick access
                const key = CHUNK_KEY(sessionId, step.id);
                await redis.set(key, JSON.stringify(checked));
              } else {
                perfMonitor.recordCacheMiss();
                
                // Emit progress for this specific step starting
                io.to(sessionId).emit('progress', {
                  stepId: step.id,
                  status: 'generating',
                  message: `Generating ${step.tag}: ${step.desc.slice(0, 50)}...`
                });
                
                // Generate the step (new signature without params)
                const code = await codegenAgent(step, query);
                const compiled: RenderChunk = await compilerRouter(code, step.compiler);
                checked = await debugAgent(compiled);
                
                // Cache the result in both places
                const key = CHUNK_KEY(sessionId, step.id);
                await redis.set(key, JSON.stringify(checked));
                await cacheManager.cacheChunk(query, step.id, checked);
              }
              
              const genTime = Date.now() - stepStartTime;
              perfMonitor.endStepGeneration(sessionId, step.id, true);
              logger.debug(`[parallel] Step ${step.id} generated in ${genTime}ms`);
              
              // Emit progress for this specific step completed
              io.to(sessionId).emit('progress', {
                stepId: step.id,
                status: 'ready',
                generationTime: genTime,
                actionsCount: checked.actions?.length || 0,
                message: `Step ${step.id} ready (${checked.actions?.length || 0} actions)`
              });
              
              return { stepId: step.id, success: true, time: genTime, actions: checked.actions?.length };
            } catch (error) {
              const genTime = Date.now() - stepStartTime;
              perfMonitor.endStepGeneration(sessionId, step.id, false);
              logger.error(`[parallel] Step ${step.id} failed: ${error}`);
              
              // Emit error for this step
              io.to(sessionId).emit('progress', {
                stepId: step.id,
                status: 'error',
                error: String(error),
                message: `Step ${step.id} generation failed`
              });
              
              // Don't stop entire process - continue with other steps
              return { stepId: step.id, success: false, error: String(error), time: genTime };
            }
          })()
        );
      }
      
      // Wait for all parallel generations
      const results = await Promise.allSettled(generationPromises);
      const totalTime = Date.now() - startTime;
      
      // Analyze results
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
      const failed = results.length - successful;
      
      logger.debug(`[parallel] Parallel generation complete: ${successful}/${results.length} successful in ${totalTime}ms`);
      
      // Complete performance tracking
      perfMonitor.completeRequest(sessionId, successful > 0);
      
      // Emit overall status with performance metrics
      const metrics = perfMonitor.getMetrics();
      io.to(sessionId).emit('status', {
        type: 'generation_complete',
        successful,
        failed,
        totalTime,
        message: `Generated ${successful} of ${results.length} steps in ${(totalTime/1000).toFixed(1)}s`,
        performance: {
          cacheHitRate: metrics.cacheHitRate,
          avgPlanTime: metrics.averagePlanTime,
          avgStepTime: metrics.averageStepTime
        }
      });
      
      // EMIT ALL STEPS QUICKLY FOR DEBUGGING
      if (successful > 0) {
        // First, emit the plan immediately
        io.to(sessionId).emit('rendered', {
          type: 'actions',
          actions: [], // Empty actions for plan-only event
          plan: {
            title: plan.title,
            subtitle: plan.subtitle,
            toc: plan.toc
          }
        });
        logger.debug(`[parallel] Emitted plan for session ${sessionId}`);
        
        // Emit all steps with small delays to test canvas rendering
        let delay = 2000; // Start after 2 seconds
        
        for (let i = 0; i < plan.steps.length; i++) {
          const step = plan.steps[i];
          const cached = await redis.get(CHUNK_KEY(sessionId, step.id));
          
          if (cached) {
            const chunk = JSON.parse(cached);
            
            const eventData = { 
              type: 'actions', // CRITICAL: Must be 'actions'
              actions: chunk.actions, // Frontend expects this
              stepId: step.id,
              step: step, 
              plan: { title: plan.title, subtitle: plan.subtitle, toc: plan.toc }
            };
            
            // Emit each step with 3 second delay
            setTimeout(() => {
              io.to(sessionId).emit('rendered', eventData);
              logger.debug(`[parallel] Emitted step ${step.id} at ${delay}ms`);
            }, delay);
            
            delay += 3000; // 3 seconds between steps for debugging
          }
        }
        
        logger.debug(`[parallel] All steps scheduled for emission`);
      }
      
      logger.debug(`[parallel] Job complete for session ${sessionId}`);
    },
    { connection: workerConnection, concurrency: 2 } // Reduced to 2 parallel to avoid API overload
  );
  logger.debug('NEW Parallel worker created');
  
  // REMOVED: Old emit worker - we now emit directly from parallel worker
  // const emitWorker = new Worker(...);

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

  // Add API endpoints for monitoring
  const getPerformanceReport = () => perfMonitor.generateReport();
  const getCacheStats = () => cacheManager.getStats();
  const clearCache = () => cacheManager.clearAll();
  
  return {
    enqueuePlan,
    setParams,
    getPerformanceReport,
    getCacheStats,
    clearCache
  };
}
