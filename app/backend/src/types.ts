export type CompilerType = 'js' | 'latex' | 'wasm-py';

export interface PlanStep {
  id: number;
  desc: string;
  compiler: CompilerType;
  complexity: number; // 1-10
  tag?: string;       // semantic tag, e.g., 'rc_axes', 'rc_curve', 'rc_annotation'
}

export interface Plan {
  title: string;
  steps: PlanStep[];
}

export type Action =
  | { op: 'drawAxis'; normalized?: boolean; x0?: number; y0?: number; width?: number; height?: number; xLabel?: string; yLabel?: string }
  | { op: 'drawCurve'; normalized?: boolean; points: [number, number][]; color?: string; duration?: number; width?: number }
  | { op: 'drawLabel'; normalized?: boolean; text: string; x: number; y: number; color?: string }
  | { op: 'drawMathLabel'; normalized?: boolean; tex: string; x: number; y: number }
  | { op: 'clear'; target?: 'all' | 'layer' };

export interface RenderChunk {
  type: 'actions';
  actions: Action[];
  stepId?: number;
}

export interface SessionParams {
  R?: number; // Ohms
  C?: number; // Farads
  V?: number; // Volts
}

export interface PlanJobData {
  query: string;
  sessionId: string;
}

export interface GenJobData {
  step: PlanStep;
  sessionId: string;
  plan: Plan;
}
