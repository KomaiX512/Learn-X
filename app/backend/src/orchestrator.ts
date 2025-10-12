import { Queue, Worker, Job, JobsOptions } from 'bullmq';
import { Server as IOServer } from 'socket.io';
import Redis from 'ioredis';
import { logger } from './logger';
import { plannerAgent } from './agents/planner';
import { codegenAgent } from './agents/codegen';
import codegenAgentV2 from './agents/codegenV2';
import codegenV3 from './agents/codegenV3';
import { codegenV3WithRetry } from './agents/codegenV3WithRetry';
import { generateTranscript } from './agents/transcriptGenerator';
import { compilerRouter } from './compiler/router';
import { debugAgent } from './agents/debugger';
import { SessionParams, Plan, RenderChunk, PlanStep } from './types';
import { CacheManager } from './services/cache-manager';
import { PerformanceMonitor } from './services/performance-monitor';

type PlanJobData = { query: string; sessionId: string };
type GenJobData = { step: any; sessionId: string; prefetch?: boolean };
type VisualDescription = { visualNumber: number; description: string };

const PLAN_KEY = (sessionId: string) => `session:${sessionId}:plan`;
const QUERY_KEY = (sessionId: string) => `session:${sessionId}:query`;
const CURRENT_STEP_KEY = (sessionId: string) => `session:${sessionId}:current_step`;
const PARAMS_KEY = (sessionId: string) => `session:${sessionId}:params`;
const CHUNK_KEY = (sessionId: string, stepId: number) => `session:${sessionId}:step:${stepId}:chunk`;
const LEARNING_STATE_KEY = (sessionId: string) => `session:${sessionId}:learning_state`;

// Production config: 4 visuals per step
const VISUALS_PER_STEP = 4;

// Progressive learning timing - NOT USED anymore (immediate emission)
// Kept for reference only
const TIMING_BY_COMPLEXITY: { [key: number]: number } = {
  1: 0,   // Immediate
  2: 0,   // Immediate  
  3: 0,   // Immediate
  4: 0,   // Immediate
  5: 0    // Immediate
};

/**
 * Generate multiple visuals + transcript for a single step
 * PRODUCTION QUALITY: 4 visuals with detailed transcript
 */
async function generateStepVisuals(
  step: PlanStep,
  topic: string,
  sessionId: string
): Promise<{ actions: any[], transcript: string, visualDescriptions: VisualDescription[] }> {
  
  logger.info(`[stepVisuals] Generating ${VISUALS_PER_STEP} visuals for step ${step.id}`);
  
  const visualDescriptions: VisualDescription[] = [];
  const allActions: any[] = [];
  
  // Generate 4 visuals in parallel - each is independent API call
  const visualPromises = Array.from({ length: VISUALS_PER_STEP }, async (_, index) => {
    const visualNumber = index + 1;
    logger.info(`[stepVisuals] Starting visual ${visualNumber}/${VISUALS_PER_STEP} for step ${step.id}`);
    
    try {
      // Each visual uses the SAME codegenV3WithRetry - proven to work
      const result = await codegenV3WithRetry(step, topic);
      
      if (!result || !result.actions || result.actions.length === 0) {
        logger.warn(`[stepVisuals] Visual ${visualNumber} returned no actions`);
        return null;
      }
      
      // Store description for transcript generation
      const description = `Animated SVG visualization showing: ${step.desc.substring(0, 100)}`;
      visualDescriptions.push({ visualNumber, description });
      
      logger.info(`[stepVisuals] ✅ Visual ${visualNumber} complete with ${result.actions.length} actions`);
      return result.actions[0]; // Extract the customSVG action
      
    } catch (error: any) {
      logger.error(`[stepVisuals] Visual ${visualNumber} failed: ${error.message}`);
      return null;
    }
  });
  
  // Wait for all visuals to complete
  const visualResults = await Promise.all(visualPromises);
  
  // Filter out nulls and collect successful visuals
  const successfulVisuals = visualResults.filter(v => v !== null);
  allActions.push(...successfulVisuals);
  
  logger.info(`[stepVisuals] Generated ${successfulVisuals.length}/${VISUALS_PER_STEP} visuals successfully`);
  
  // Generate transcript based on visual descriptions
  let transcript = '';
  if (visualDescriptions.length > 0) {
    logger.info(`[stepVisuals] Generating transcript for ${visualDescriptions.length} visuals`);
    const transcriptResult = await generateTranscript(step, topic, visualDescriptions);
    transcript = transcriptResult || `Step ${step.id}: ${step.desc}`;
    logger.info(`[stepVisuals] ✅ Transcript generated (${transcript.length} chars)`);
  } else {
    logger.warn(`[stepVisuals] No visuals succeeded, using fallback transcript`);
    transcript = `Step ${step.id}: ${step.desc}`;
  }
  
  return {
    actions: allActions,
    transcript,
    visualDescriptions
  };
}

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
      const { query, sessionId } = job.data;
      
      console.log('\n' + '─'.repeat(70));
      console.log('📋 PLAN WORKER STARTED');
      console.log('─'.repeat(70));
      console.log('Session:', sessionId);
      console.log('Query:', query);
      console.log('Time:', new Date().toISOString());
      console.log('─'.repeat(70));
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

      // EMIT PLAN EVENT TO FRONTEND (CRITICAL FIX)
      io.to(sessionId).emit('plan', {
        title: plan.title,
        subtitle: plan.subtitle,
        toc: plan.toc,
        steps: plan.steps.map(s => ({ id: s.id, tag: s.tag, desc: s.desc }))
      });
      logger.debug(`[plan] Emitted plan event to session ${sessionId}`);
      
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
        const version = process.env.USE_VISUAL_VERSION || 'v3';
        logger.info(`[orchestrator] 🚀 Using ${version} pipeline for step ${step.id}`);
        
        // Use retry wrapper for V3
        const code = version === 'v3' ? await codegenV3WithRetry(step, query) : 
                     version === 'v2' ? await codegenAgentV2(step, query) : 
                     await codegenAgent(step, query);
        
        // CRITICAL: Handle null from codegen
        if (!code) {
          logger.error(`[gen] ❌ PREFETCH FAILED: codegen returned null for step ${step.id}`);
          return; // Skip caching, will retry on actual emit
        }
        
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
          const version = process.env.USE_VISUAL_VERSION || 'v3';
          logger.info(`[orchestrator] 🚀 Using ${version} pipeline for step ${step.id}`);
          
          // Use retry wrapper for V3
          const code = version === 'v3' ? await codegenV3WithRetry(step, query) : 
                       version === 'v2' ? await codegenAgentV2(step, query) : 
                       await codegenAgent(step, query);
          
          // CRITICAL: Handle null from codegen
          if (!code) {
            logger.error(`[gen] ❌ GENERATION FAILED: codegen returned null after all retries for step ${step.id}`);
            throw new Error(`Generation failed after ${3} retry attempts for step ${step.id}`);
          }
          
          logger.debug(`[gen] OK: codegen completed for session=${sessionId} step=${step.id} in ${Date.now() - startTime}ms`);
          const compiled: RenderChunk = await compilerRouter(code, step.compiler);
          checked = await debugAgent(compiled);
          await redis.set(key, JSON.stringify(checked));
        } catch (error) {
          logger.error(`[gen] CRITICAL FAILURE for session=${sessionId} step=${step.id}: ${error}`);
          // Let it fail but with better error message
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
      console.log('\n' + '='.repeat(100));
      console.log('🔥 PARALLEL WORKER CALLED');
      console.log('='.repeat(100));
      console.log('Job ID:', job.id);
      console.log('Job name:', job.name);
      console.log('Job data keys:', Object.keys(job.data || {}));
      console.log('='.repeat(100) + '\n');
      
      if (job.name !== 'parallel-generate') {
        logger.error(`[parallel] SKIPPING: Job name is '${job.name}', expected 'parallel-generate'`);
        return;
      }
      const { sessionId, plan, query } = job.data as any;
      
      console.log('\n' + '─'.repeat(70));
      console.log('⚡ PARALLEL WORKER STARTED');
      console.log('─'.repeat(70));
      console.log('Session:', sessionId);
      console.log('Query:', query);
      console.log('Steps to generate:', plan.steps.length);
      console.log('Time:', new Date().toISOString());
      console.log('─'.repeat(70));
      
      logger.info(`[parallel] ⚡ STARTING parallel generation for ${plan.steps.length} steps (session: ${sessionId})`);
      
      const paramsRaw = await redis.get(PARAMS_KEY(sessionId));
      const params: SessionParams = paramsRaw ? JSON.parse(paramsRaw) : {};
      
      // Track generation progress
      const generationPromises: Promise<any>[] = [];
      const startTime = Date.now();
      
      // CRITICAL FIX: Store results in memory for direct emit (don't rely on cache)
      const stepResults = new Map<number, RenderChunk | null>();
      
      // Emit initial progress
      io.to(sessionId).emit('generation_progress', {
        phase: 'starting',
        totalSteps: plan.steps.length,
        completedSteps: 0,
        message: `🚀 Starting generation of ${plan.steps.length} steps...`
      });
      
      let completedCount = 0;
      
      // Generate all steps in parallel WITH IMMEDIATE EMISSION
      // Optimized for Gemini 2.5 Flash Paid Tier (1,000-4,000 RPM)
      // Stagger by 2s for optimal throughput without hitting burst limits
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        
        // Add 2-second staggered delay (optimized for paid tier)
        if (i > 0) {
          const delay = 2000; // Reduced from 5s to 2s for faster user experience
          logger.info(`[parallel] ⏸️  Staggering ${delay}ms before step ${step.id} (optimized for paid tier)`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
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
                  message: `Generating ${VISUALS_PER_STEP} visuals for ${step.tag}...`
                });
                
                // PRODUCTION: Generate 4 visuals + transcript
                logger.info(`[parallel] 🚀 Step ${step.id}: Generating ${VISUALS_PER_STEP} visuals + transcript`);
                
                const { actions, transcript, visualDescriptions } = await generateStepVisuals(step, query, sessionId);
                
                // CRITICAL: Handle empty results
                if (!actions || actions.length === 0) {
                  logger.error(`[parallel] ❌ Step ${step.id} generated no visuals`);
                  throw new Error(`Step ${step.id} generation produced no visuals`);
                }
                
                // Build the result chunk with transcript
                checked = {
                  type: 'actions',
                  stepId: step.id,
                  actions,
                  transcript, // NEW: Include transcript in emission
                  meta: {
                    visualCount: actions.length,
                    transcriptLength: transcript.length
                  }
                } as any;
                
                // Cache the result in both places
                const key = CHUNK_KEY(sessionId, step.id);
                await redis.set(key, JSON.stringify(checked));
                await cacheManager.cacheChunk(query, step.id, checked);
              }
              
              const genTime = Date.now() - stepStartTime;
              perfMonitor.endStepGeneration(sessionId, step.id, true);
              logger.info(`[parallel] ✅ Step ${step.id} COMPLETE in ${genTime}ms with ${checked.actions?.length || 0} actions`);
              
              // CRITICAL: Store in memory
              stepResults.set(step.id, checked);
              
              // IMMEDIATE EMISSION - Don't wait for other steps!
              const eventData = { 
                type: 'actions',
                actions: checked.actions,
                transcript: (checked as any).transcript || '', // Include transcript for narration
                stepId: step.id,
                step: step, 
                plan: { title: plan.title, subtitle: plan.subtitle, toc: plan.toc },
                totalSteps: plan.steps.length,
                meta: (checked as any).meta // Include metadata about visual count
              };
              
              // DEBUGGING: Log room membership
              const roomSockets = io.sockets.adapter.rooms.get(sessionId);
              const socketCount = roomSockets ? roomSockets.size : 0;
              
              console.log('');
              console.log('═'.repeat(70));
              console.log('🚀 ABOUT TO EMIT STEP');
              console.log('═'.repeat(70));
              console.log('SessionId:', sessionId);
              console.log('StepId:', step.id);
              console.log('Actions:', checked.actions.length);
              console.log('Room sockets:', socketCount);
              console.log('═'.repeat(70));
              
              io.to(sessionId).emit('rendered', eventData);
              
              console.log('✅ EMITTED SUCCESSFULLY');
              console.log('');
              
              logger.info(`[parallel] 🚀 IMMEDIATELY EMITTED step ${step.id} to frontend (${socketCount} sockets)`);
              
              // Emit progress
              completedCount++;
              const progressPercent = Math.round((completedCount / plan.steps.length) * 100);
              
              io.to(sessionId).emit('progress', {
                stepId: step.id,
                status: 'ready',
                generationTime: genTime,
                actionsCount: checked.actions?.length || 0,
                message: `Step ${step.id} ready (${checked.actions?.length || 0} actions)`
              });
              
              io.to(sessionId).emit('generation_progress', {
                phase: 'generating',
                totalSteps: plan.steps.length,
                completedSteps: completedCount,
                progress: progressPercent,
                message: `✅ ${completedCount}/${plan.steps.length} steps ready (${progressPercent}%)`
              });
              
              return { stepId: step.id, success: true, time: genTime, actions: checked.actions?.length };
            } catch (error) {
              const genTime = Date.now() - stepStartTime;
              perfMonitor.endStepGeneration(sessionId, step.id, false);
              logger.error(`[parallel] Step ${step.id} failed: ${error}`);
              
              // Store null for failed steps
              stepResults.set(step.id, null);
              
              // Emit error immediately
              io.to(sessionId).emit('rendered', {
                type: 'error',
                stepId: step.id,
                step: step,
                message: `Step ${step.id} failed to generate`,
                error: String(error)
              });
              
              io.to(sessionId).emit('progress', {
                stepId: step.id,
                status: 'error',
                error: String(error),
                message: `Step ${step.id} generation failed`
              });
              
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
      
      // Emit final progress update
      io.to(sessionId).emit('generation_progress', {
        phase: 'complete',
        totalSteps: plan.steps.length,
        completedSteps: successful,
        progress: 100,
        message: `🎉 Generation complete! ${successful}/${plan.steps.length} steps ready in ${(totalTime/1000).toFixed(1)}s`
      });
      
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
      
      // NO SEQUENTIAL DELIVERY - Steps are emitted immediately as they complete above!
      
      logger.debug(`[parallel] Job complete for session ${sessionId}`);
    },
    { connection: workerConnection, concurrency: 2 } // Reduced to 2 parallel to avoid API overload
  );
  logger.debug('NEW Parallel worker created');
  
  // REMOVED: Old emit worker - we now emit directly from parallel worker
  // const emitWorker = new Worker(...);

  planWorker.on('failed', (job, err) => logger.error(`[plan:failed] id=${job?.id} ${String(err)}`));
  genWorker.on('failed', (job, err) => logger.error(`[gen:failed] id=${job?.id} ${String(err)}`));
  parallelWorker.on('failed', (job, err) => {
    logger.error(`[parallel:FAILED] id=${job?.id} session=${job?.data?.sessionId}`);
    logger.error(`[parallel:FAILED] Error: ${String(err)}`);
    logger.error(`[parallel:FAILED] Stack: ${err.stack}`);
  });

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
