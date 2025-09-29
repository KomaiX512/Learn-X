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
  subtitle: string;
  toc: TocItem[];
  steps: PlanStep[];
}

export interface TocItem {
  minute: number;
  title: string;
  summary?: string;
}

export type Action =
  | { op: 'drawAxis'; normalized?: boolean; x0?: number; y0?: number; width?: number; height?: number; xLabel?: string; yLabel?: string }
  | { op: 'drawCurve'; normalized?: boolean; points: [number, number][]; color?: string; duration?: number; width?: number }
  | { op: 'drawLabel'; normalized?: boolean; text: string; x: number; y: number; color?: string; isTitle?: boolean }
  | { op: 'drawMathLabel'; normalized?: boolean; tex: string; x: number; y: number }
  | { op: 'clear'; target?: 'all' | 'layer' }
  | { op: 'delay'; duration: number }
  | { op: 'drawTitle'; text: string; y?: number; duration?: number }
  | { op: 'drawCircle'; normalized?: boolean; x: number; y: number; radius: number; color?: string; fill?: boolean }
  | { op: 'drawRect'; normalized?: boolean; x: number; y: number; width: number; height: number; color?: string; fill?: boolean }
  | { op: 'drawVector'; normalized?: boolean; x1: number; y1: number; x2: number; y2: number; color?: string; width?: number }
  | { op: 'orbit'; centerX: number; centerY: number; radius: number; period: number; objectRadius: number; color?: string; trail?: boolean }
  | { op: 'wave'; startX: number; startY: number; width: number; amplitude: number; frequency: number; speed: number; color?: string }
  | { op: 'particle'; x: number; y: number; count: number; spread: number; speed: number; lifetime: number; color?: string }
  | { op: 'arrow'; x: number; y: number; angle: number; length: number; color?: string; animated?: boolean }
  | { op: 'field'; type: 'electric' | 'magnetic' | 'vector'; gridSize: number; strength: number }
  | { op: 'flow'; path: [number, number][]; particleCount: number; speed: number; color?: string }
  | { op: 'customPath'; path: string; x?: number; y?: number; fill?: string; stroke?: string; strokeWidth?: number; scale?: number; glow?: boolean }
  | { op: 'drawGraph'; func: string; domain: [number, number]; color?: string; scale?: number }
  | { op: 'drawDiagram'; type: 'neuralNetwork' | 'molecule' | 'circuit' | 'anatomy'; x?: number; y?: number; layers?: number[]; atoms?: any[]; bonds?: any[] };

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
