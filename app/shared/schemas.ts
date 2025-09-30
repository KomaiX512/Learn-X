import { z } from 'zod';

export const CompilerTypeSchema = z.enum(['js', 'latex', 'wasm-py']);

export const PlanStepSchema = z.object({
  id: z.number(),
  desc: z.string(),
  compiler: CompilerTypeSchema,
  complexity: z.number().min(1).max(10),
  tag: z.string().optional()
});
export const TocItemSchema = z.object({
  minute: z.number().int().min(1),
  title: z.string(),
  summary: z.string().optional()
});

export const PlanSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  toc: z.array(TocItemSchema).min(1),
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
  }),
  z.object({
    op: z.literal('latex'),
    equation: z.string(),
    x: z.number(),
    y: z.number(),
    size: z.number().optional(),
    color: z.string().optional(),
    animated: z.boolean().optional()
  }),
  z.object({
    op: z.literal('anatomy'),
    type: z.string(),
    x: z.number(),
    y: z.number(),
    layer: z.number().optional(),
    detail: z.string().optional()
  }),
  z.object({
    op: z.literal('molecule'),
    formula: z.string(),
    x: z.number(),
    y: z.number(),
    structure: z.string().optional(),
    color: z.string().optional()
  }),
  z.object({
    op: z.literal('neuralNetwork'),
    layers: z.array(z.number()),
    x: z.number(),
    y: z.number(),
    activation: z.string().optional(),
    showWeights: z.boolean().optional()
  }),
  z.object({
    op: z.literal('linearMotion'),
    startX: z.number(),
    startY: z.number(),
    endX: z.number(),
    endY: z.number(),
    duration: z.number(),
    label: z.string().optional(),
    color: z.string().optional()
  }),
  z.object({
    op: z.literal('circularMotion'),
    centerX: z.number(),
    centerY: z.number(),
    radius: z.number(),
    angularVelocity: z.number(),
    color: z.string().optional(),
    object: z.string().optional()
  }),
  z.object({
    op: z.literal('simulate'),
    type: z.string(),
    x: z.number(),
    y: z.number(),
    params: z.array(z.any()).optional()
  }),
  z.object({
    op: z.literal('graph'),
    function: z.string(),
    xMin: z.number(),
    xMax: z.number(),
    yMin: z.number(),
    yMax: z.number(),
    gridOn: z.boolean().optional(),
    lineColor: z.string().optional(),
    gridColor: z.string().optional()
  }),
  // ELECTRICAL & ELECTRONICS
  z.object({
    op: z.literal('drawCircuitElement'),
    type: z.string(), // resistor, capacitor, transistor_npn, op_amp, etc.
    x: z.number(),
    y: z.number(),
    rotation: z.number().optional(),
    label: z.string().optional(),
    value: z.string().optional()
  }),
  z.object({
    op: z.literal('drawSignalWaveform'),
    waveform: z.string(), // sine, square, triangle, etc.
    amplitude: z.number(),
    frequency: z.number().optional(),
    phase: z.number().optional(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    label: z.string().optional(),
    animate: z.boolean().optional()
  }),
  z.object({
    op: z.literal('drawConnection'),
    from: z.tuple([z.number(), z.number()]),
    to: z.tuple([z.number(), z.number()]),
    waypoints: z.array(z.tuple([z.number(), z.number()])).optional(),
    type: z.string().optional(), // wire, ground, power
    showArrow: z.boolean().optional(),
    label: z.string().optional()
  }),
  // PHYSICS & MECHANICS
  z.object({
    op: z.literal('drawForceVector'),
    x: z.number(),
    y: z.number(),
    dx: z.number(),
    dy: z.number(),
    magnitude: z.number().optional(),
    label: z.string().optional(),
    color: z.string().optional(),
    showMagnitude: z.boolean().optional()
  }),
  z.object({
    op: z.literal('drawPhysicsObject'),
    shape: z.string(), // circle, box, sphere
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number().optional(),
    mass: z.number().optional(),
    velocity: z.tuple([z.number(), z.number()]).optional(),
    label: z.string().optional(),
    color: z.string().optional()
  }),
  z.object({
    op: z.literal('drawTrajectory'),
    path: z.array(z.tuple([z.number(), z.number()])),
    showVelocity: z.boolean().optional(),
    showAcceleration: z.boolean().optional(),
    pathStyle: z.string().optional(),
    animate: z.boolean().optional()
  }),
  z.object({
    op: z.literal('drawFieldLines'),
    type: z.string(), // electric, magnetic, gravitational
    sources: z.array(z.tuple([z.number(), z.number(), z.number()])),
    density: z.number().optional(),
    showArrows: z.boolean().optional()
  }),
  // BIOLOGY & ANATOMY
  z.object({
    op: z.literal('drawCellStructure'),
    type: z.string(), // animal, plant, neuron, etc.
    x: z.number(),
    y: z.number(),
    size: z.number(),
    showOrganelles: z.boolean().optional(),
    organelles: z.array(z.string()).optional(),
    detail: z.string().optional(),
    labels: z.boolean().optional()
  }),
  z.object({
    op: z.literal('drawOrganSystem'),
    organ: z.string(), // heart, brain, lung, etc.
    style: z.string().optional(),
    showLabels: z.boolean().optional(),
    highlightParts: z.array(z.string()).optional(),
    showFlow: z.boolean().optional()
  }),
  z.object({
    op: z.literal('drawMolecularStructure'),
    type: z.string(), // protein, dna, rna
    structure: z.string().optional(),
    sequence: z.string().optional(),
    style: z.string().optional(),
    showBonds: z.boolean().optional()
  }),
  z.object({
    op: z.literal('drawMembrane'),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    showProteins: z.boolean().optional(),
    showChannels: z.boolean().optional(),
    showTransport: z.boolean().optional()
  }),
  // CHEMISTRY
  z.object({
    op: z.literal('drawAtom'),
    element: z.string(),
    x: z.number(),
    y: z.number(),
    showElectrons: z.boolean().optional(),
    showNucleus: z.boolean().optional(),
    showOrbitals: z.boolean().optional(),
    label: z.string().optional()
  }),
  z.object({
    op: z.literal('drawMolecule'),
    formula: z.string(),
    structure: z.string().optional(),
    showBonds: z.boolean().optional(),
    showAngles: z.boolean().optional(),
    atoms: z.array(z.any()).optional(),
    bonds: z.array(z.any()).optional(),
    style: z.string().optional()
  }),
  z.object({
    op: z.literal('drawReaction'),
    reactants: z.array(z.any()),
    products: z.array(z.any()),
    reactionType: z.string().optional(),
    showEnergy: z.boolean().optional(),
    showMechanism: z.boolean().optional()
  }),
  // MATHEMATICS
  z.object({
    op: z.literal('drawGraph'),
    type: z.string().optional(),
    function: z.string(),
    xMin: z.number(),
    xMax: z.number(),
    yMin: z.number(),
    yMax: z.number(),
    showGrid: z.boolean().optional(),
    showAxes: z.boolean().optional(),
    gridColor: z.string().optional(),
    lineColor: z.string().optional(),
    lineWidth: z.number().optional(),
    fillUnder: z.boolean().optional(),
    label: z.string().optional()
  }),
  z.object({
    op: z.literal('drawGeometry'),
    shape: z.string(),
    vertices: z.array(z.tuple([z.number(), z.number()])),
    showAngles: z.boolean().optional(),
    showSides: z.boolean().optional(),
    showArea: z.boolean().optional(),
    labels: z.any().optional(),
    highlightProperties: z.boolean().optional()
  }),
  z.object({
    op: z.literal('drawCoordinateSystem'),
    type: z.string(),
    dimensions: z.number(),
    xRange: z.tuple([z.number(), z.number()]),
    yRange: z.tuple([z.number(), z.number()]),
    zRange: z.tuple([z.number(), z.number()]).optional(),
    showGrid: z.boolean().optional(),
    showLabels: z.boolean().optional(),
    gridSpacing: z.number().optional()
  }),
  // COMPUTER SCIENCE
  z.object({
    op: z.literal('drawDataStructure'),
    type: z.string(),
    data: z.array(z.any()),
    showPointers: z.boolean().optional(),
    showIndices: z.boolean().optional(),
    highlightNodes: z.array(z.number()).optional(),
    layout: z.string().optional()
  }),
  z.object({
    op: z.literal('drawAlgorithmStep'),
    algorithm: z.string(),
    currentState: z.any(),
    highlightElements: z.array(z.number()).optional(),
    showComparison: z.boolean().optional(),
    showSwap: z.boolean().optional(),
    stepDescription: z.string().optional()
  }),
  z.object({
    op: z.literal('drawFlowchart'),
    nodes: z.array(z.any()),
    connections: z.array(z.any()),
    layout: z.string().optional()
  }),
  // GENERAL
  z.object({
    op: z.literal('drawDiagram'),
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
    layout: z.string().optional()
  }),
  z.object({
    op: z.literal('drawAnnotation'),
    text: z.string(),
    pointingTo: z.tuple([z.number(), z.number()]),
    position: z.tuple([z.number(), z.number()]),
    style: z.string().optional()
  }),
  z.object({
    op: z.literal('animate'),
    objectId: z.string(),
    animation: z.string(),
    from: z.any().optional(),
    to: z.any(),
    duration: z.number(),
    easing: z.string().optional()
  }),
  z.object({
    op: z.literal('createSimulation'),
    type: z.string(),
    objects: z.array(z.any()),
    rules: z.any().optional(),
    timeStep: z.number().optional(),
    duration: z.number().optional()
  }),
  // Enhanced drawLabel with overlap prevention
  z.object({
    op: z.literal('drawLabel'),
    normalized: z.boolean().optional(),
    text: z.string(),
    x: z.number(),
    y: z.number(),
    fontSize: z.number().optional(),
    color: z.string().optional(),
    background: z.string().optional(),
    connectedTo: z.object({ x: z.number(), y: z.number() }).optional(),
    avoidOverlap: z.boolean().optional()
  }),
  z.object({
    op: z.literal('drawTitle'),
    text: z.string(),
    x: z.number(),
    y: z.number(),
    size: z.number().optional(),
    color: z.string().optional(),
    background: z.string().optional()
  }),
  z.object({
    op: z.literal('delay'),
    duration: z.number()
  })
]);

export const RenderChunkSchema = z.object({
  type: z.literal('actions'),
  actions: z.array(ActionSchema),
  stepId: z.number().optional()
});

export type TocItem = z.infer<typeof TocItemSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type PlanStep = z.infer<typeof PlanStepSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type RenderChunk = z.infer<typeof RenderChunkSchema>;
