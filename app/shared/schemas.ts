import { z } from 'zod';

export const CompilerTypeSchema = z.enum(['js', 'latex', 'wasm-py']);

export const PlanStepSchema = z.object({
  id: z.number(),
  desc: z.string(),
  compiler: CompilerTypeSchema,
  complexity: z.number().min(1).max(10),
  tag: z.string().optional()
});
export const PlanSchema = z.object({
  steps: z.array(PlanStepSchema).min(1)
});

export const ActionSchema = z.union([
  z.object({
    op: z.literal('drawAxis'),
    normalized: z.boolean().optional(),
    x0: z.number().optional(),
    y0: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    xLabel: z.string().optional(),
    yLabel: z.string().optional()
  }),
  z.object({
    op: z.literal('drawCurve'),
    normalized: z.boolean().optional(),
    points: z.array(z.tuple([z.number(), z.number()])).min(2),
    color: z.string().optional(),
    duration: z.number().optional(),
    width: z.number().optional()
  }),
  z.object({
    op: z.literal('drawLabel'),
    normalized: z.boolean().optional(),
    text: z.string(),
    x: z.number(),
    y: z.number(),
    color: z.string().optional()
  }),
  z.object({
    op: z.literal('drawMathLabel'),
    normalized: z.boolean().optional(),
    tex: z.string(),
    x: z.number(),
    y: z.number()
  }),
  z.object({
    op: z.literal('clear'),
    target: z.enum(['all', 'layer']).optional()
  })
]);

export const RenderChunkSchema = z.object({
  type: z.literal('actions'),
  actions: z.array(ActionSchema),
  stepId: z.number().optional()
});

export type Plan = z.infer<typeof PlanSchema>;
export type PlanStep = z.infer<typeof PlanStepSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type RenderChunk = z.infer<typeof RenderChunkSchema>;
