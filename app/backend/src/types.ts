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
  | { op: 'drawLabel'; normalized?: boolean; text: string; x: number; y: number; color?: string; isTitle?: boolean; fontSize?: number; bold?: boolean; italic?: boolean; avoidOverlap?: boolean }
  | { op: 'drawMathLabel'; normalized?: boolean; tex: string; x: number; y: number }
  | { op: 'clear'; target?: 'all' | 'layer' }
  | { op: 'delay'; duration: number }
  | { op: 'drawTitle'; text: string; y?: number; duration?: number; size?: number }
  | { op: 'drawCircle'; normalized?: boolean; x: number; y: number; radius: number; color?: string; fill?: boolean }
  | { op: 'drawRect'; normalized?: boolean; x: number; y: number; width: number; height: number; color?: string; fill?: boolean }
  | { op: 'drawVector'; normalized?: boolean; x1: number; y1: number; x2: number; y2: number; color?: string; width?: number; dx?: number; dy?: number }
  | { op: 'drawLine'; x1: number; y1: number; x2: number; y2: number; color?: string; width?: number }
  | { op: 'orbit'; centerX: number; centerY: number; radius: number; period: number; objectRadius: number; color?: string; trail?: boolean }
  | { op: 'wave'; startX: number; startY: number; width: number; amplitude: number; frequency: number; speed: number; color?: string }
  | { op: 'particle'; x: number; y: number; count: number; spread: number; speed: number; lifetime: number; color?: string; center?: [number, number] }
  | { op: 'arrow'; x: number; y: number; angle: number; length: number; color?: string; animated?: boolean }
  | { op: 'field'; type: 'electric' | 'magnetic' | 'vector'; gridSize: number; strength: number }
  | { op: 'flow'; path: [number, number][]; particleCount: number; speed: number; color?: string }
  | { op: 'customPath'; path: string; x?: number; y?: number; fill?: string; stroke?: string; strokeWidth?: number; scale?: number; glow?: boolean }
  | { op: 'customSVG'; svgCode: string; visualGroup?: string; width?: number; height?: number }
  | { op: 'drawGraph'; func: string; domain: [number, number]; color?: string; scale?: number }
  | { op: 'drawDiagram'; type: 'neuralNetwork' | 'molecule' | 'circuit' | 'anatomy'; x?: number; y?: number; layers?: number[]; atoms?: any[]; bonds?: any[] }
  // V2 Domain-Specific Operations
  | { op: 'drawCircuitElement'; type: string; x: number; y: number; rotation?: number; label?: string; value?: string; [key: string]: any }
  | { op: 'drawSignalWaveform'; waveform: string; amplitude: number; x: number; y: number; width: number; frequency?: number; phase?: number; label?: string; animate?: boolean; [key: string]: any }
  | { op: 'drawConnection'; from: [number, number]; to: [number, number]; type?: string; color?: string; strokeWidth?: number; showArrow?: boolean; weight?: number; [key: string]: any }
  | { op: 'drawPhysicsObject'; shape: string; x: number; y: number; radius?: number; width?: number; height?: number; mass?: number; label?: string; color?: string; [key: string]: any }
  | { op: 'drawForceVector'; x: number; y: number; dx: number; dy: number; magnitude?: number; label?: string; color?: string; [key: string]: any }
  | { op: 'drawTrajectory'; path: [number, number][]; animate?: boolean; showVelocity?: boolean; [key: string]: any }
  | { op: 'drawFieldLines'; type: string; sources: any[]; density?: number; [key: string]: any }
  | { op: 'drawCellStructure'; type: string; x: number; y: number; size?: number; organelleType?: string; showOrganelles?: boolean; detail?: string; [key: string]: any }
  | { op: 'drawOrganSystem'; organ: string; style?: string; showLabels?: boolean; [key: string]: any }
  | { op: 'drawMembrane'; x: number; y: number; width: number; showProteins?: boolean; showChannels?: boolean; [key: string]: any }
  | { op: 'drawMolecule'; type?: string; formula?: string; structure?: string; atoms?: any[]; bonds?: any[]; atomicNumber?: number; electrons?: boolean; x?: number; y?: number; [key: string]: any }
  | { op: 'drawAtom'; x: number; y: number; radius?: number; element?: string; showElectrons?: boolean; showOrbitals?: boolean; color?: string; [key: string]: any }
  | { op: 'drawReaction'; reactants: any[]; products: any[]; showEnergy?: boolean; [key: string]: any }
  | { op: 'drawBond'; from: [number, number]; to: [number, number]; type?: string; [key: string]: any }
  | { op: 'drawMolecularStructure'; type: string; structure?: string; showBonds?: boolean; [key: string]: any }
  | { op: 'drawDataStructure'; type: string; x?: number; y?: number; width?: number; height?: number; data?: any; value?: any; showPointers?: boolean; color?: string; [key: string]: any }
  | { op: 'drawNeuralNetwork'; layers: number[]; x?: number; y?: number; showWeights?: boolean; [key: string]: any }
  | { op: 'drawAlgorithmStep'; step?: string; [key: string]: any }
  | { op: 'drawFlowchart'; nodes: any[]; connections?: any[]; [key: string]: any }
  | { op: 'drawCoordinateSystem'; type?: string; xRange?: [number, number]; yRange?: [number, number]; showGrid?: boolean; xLabel?: string; yLabel?: string; x?: number; y?: number; [key: string]: any }
  | { op: 'drawGeometry'; shape: string; vertices?: [number, number][]; showAngles?: boolean; showSides?: boolean; x?: number; y?: number; sides?: number; radius?: number; fill?: string; stroke?: string; [key: string]: any }
  | { op: 'drawLatex'; equation: string; x: number; y: number; size?: number; color?: string; [key: string]: any }
  | { op: 'drawMathShape'; type: string; x: number; y: number; sides?: number; radius?: number; fill?: string; stroke?: string; [key: string]: any }
  | { op: 'drawNeuron'; x: number; y: number; radius?: number; activation?: number; label?: string; color?: string; showValue?: boolean; [key: string]: any }
  | { op: 'animate'; target?: string; objectId?: string; type?: string; animation?: string; duration?: number; to?: any; [key: string]: any }
  | { op: 'createSimulation'; [key: string]: any }
  | { op: 'drawAnnotation'; [key: string]: any };

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
