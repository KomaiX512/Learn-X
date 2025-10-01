/**
 * Domain-Specific Renderers for V2 Operations
 * 
 * Implements rendering for circuit elements, waveforms, and other domain-specific visualizations
 */

import Konva from 'konva';

export class DomainRenderers {
  private layer: Konva.Layer;
  private stage: Konva.Stage;
  
  constructor(stage: Konva.Stage, layer: Konva.Layer) {
    this.stage = stage;
    this.layer = layer;
  }
  
  // ===== Helpers to keep coordinates safe =====
  private toNum(v: any, fallback: number = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  private clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
  }
  
  /**
   * Update the layer to render to (CRITICAL for multi-step rendering)
   */
  public setLayer(layer: Konva.Layer): void {
    this.layer = layer;
    console.log('[DomainRenderers] Layer updated for new step');
  }
  
  /**
   * Draw a circuit element (op-amp, resistor, capacitor, etc.)
   */
  async drawCircuitElement(params: {
    type: string;
    x: number;
    y: number;
    rotation?: number;
    label?: string;
    value?: string;
  }): Promise<void> {
    const group = new Konva.Group({
      x: params.x * this.stage.width(),
      y: params.y * this.stage.height(),
      rotation: params.rotation || 0
    });
    
    // BRIGHT COLORS FOR DARK BACKGROUND
    const color = '#00d9ff'; // Bright cyan - highly visible
    const strokeWidth = 3;
    
    switch (params.type) {
      case 'op_amp':
        // Draw operational amplifier triangle
        const triangle = new Konva.Line({
          points: [-30, -20, -30, 20, 20, 0, -30, -20],
          stroke: color,
          strokeWidth,
          closed: true
        });
        group.add(triangle);
        
        // Add + and - signs
        group.add(new Konva.Text({
          x: -25,
          y: -10,
          text: '+',
          fontSize: 12,
          fill: color
        }));
        
        group.add(new Konva.Text({
          x: -25,
          y: 5,
          text: '-',
          fontSize: 12,
          fill: color
        }));
        
        // Add input/output lines
        group.add(new Konva.Line({
          points: [-50, -10, -30, -10],
          stroke: color,
          strokeWidth: 1
        }));
        
        group.add(new Konva.Line({
          points: [-50, 10, -30, 10],
          stroke: color,
          strokeWidth: 1
        }));
        
        group.add(new Konva.Line({
          points: [20, 0, 40, 0],
          stroke: color,
          strokeWidth: 1
        }));
        break;
        
      case 'resistor':
        // Draw resistor zigzag
        const zigzag = new Konva.Line({
          points: [-20, 0, -15, -5, -10, 5, -5, -5, 0, 5, 5, -5, 10, 5, 15, -5, 20, 0],
          stroke: color,
          strokeWidth,
          lineCap: 'round',
          lineJoin: 'round'
        });
        group.add(zigzag);
        
        // Connection lines
        group.add(new Konva.Line({
          points: [-30, 0, -20, 0],
          stroke: color,
          strokeWidth: 1
        }));
        
        group.add(new Konva.Line({
          points: [20, 0, 30, 0],
          stroke: color,
          strokeWidth: 1
        }));
        break;
        
      case 'capacitor':
        // Draw capacitor plates
        group.add(new Konva.Line({
          points: [-5, -15, -5, 15],
          stroke: color,
          strokeWidth: strokeWidth + 1
        }));
        
        group.add(new Konva.Line({
          points: [5, -15, 5, 15],
          stroke: color,
          strokeWidth: strokeWidth + 1
        }));
        
        // Connection lines
        group.add(new Konva.Line({
          points: [-30, 0, -5, 0],
          stroke: color,
          strokeWidth: 1
        }));
        
        group.add(new Konva.Line({
          points: [5, 0, 30, 0],
          stroke: color,
          strokeWidth: 1
        }));
        break;
        
      case 'transistor':
        // Draw NPN transistor
        const circle = new Konva.Circle({
          radius: 20,
          stroke: color,
          strokeWidth
        });
        group.add(circle);
        
        // Base line
        group.add(new Konva.Line({
          points: [-10, -10, -10, 10],
          stroke: color,
          strokeWidth: strokeWidth + 1
        }));
        
        // Emitter arrow
        group.add(new Konva.Line({
          points: [-10, 5, 10, 15],
          stroke: color,
          strokeWidth
        }));
        
        group.add(new Konva.Line({
          points: [5, 15, 10, 15, 10, 10],
          stroke: color,
          strokeWidth: 1
        }));
        
        // Collector
        group.add(new Konva.Line({
          points: [-10, -5, 10, -15],
          stroke: color,
          strokeWidth
        }));
        break;
        
      default:
        // Generic box for unknown types
        const rect = new Konva.Rect({
          x: -20,
          y: -15,
          width: 40,
          height: 30,
          stroke: color,
          strokeWidth
        });
        group.add(rect);
    }
    
    // Add label if provided
    if (params.label) {
      const label = new Konva.Text({
        x: -30,
        y: 25,
        text: params.label,
        fontSize: 14,
        fill: color,
        align: 'center',
        width: 60
      });
      group.add(label);
    }
    
    // Add value if provided (e.g., "10kΩ")
    if (params.value) {
      const value = new Konva.Text({
        x: -30,
        y: -35,
        text: params.value,
        fontSize: 12,
        fill: '#7f8c8d',
        align: 'center',
        width: 60
      });
      group.add(value);
    }
    
    // Animate appearance with timeout safety
    group.opacity(0);
    this.layer.add(group);
    
    await new Promise<void>(resolve => {
      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };
      
      setTimeout(safeResolve, 400); // 0.3s + buffer
      
      try {
        const tween = new Konva.Tween({
          node: group,
          opacity: 1,
          duration: 0.3,
          onFinish: safeResolve
        });
        tween.play();
      } catch (error) {
        safeResolve();
      }
    });
  }
  
  /**
   * Draw a signal waveform
   */
  async drawSignalWaveform(params: {
    waveform: string;
    amplitude: number;
    frequency?: number;
    phase?: number;
    x: number;
    y: number;
    width: number;
    label?: string;
    animate?: boolean;
  }): Promise<void> {
    const points: number[] = [];
    const samples = 100;
    const freq = params.frequency || 1;
    const phase = params.phase || 0;
    
    for (let i = 0; i <= samples; i++) {
      const t = (i / samples) * 2 * Math.PI * freq;
      let value = 0;
      
      switch (params.waveform) {
        case 'sine':
          value = Math.sin(t + phase);
          break;
        case 'square':
          value = Math.sin(t + phase) >= 0 ? 1 : -1;
          break;
        case 'sawtooth':
          value = 2 * ((t / (2 * Math.PI)) % 1) - 1;
          break;
        case 'triangle':
          const period = (t / (2 * Math.PI)) % 1;
          value = period < 0.5 ? 4 * period - 1 : 3 - 4 * period;
          break;
        case 'pulse':
          value = (Math.sin(t + phase) >= 0.7) ? 1 : 0;
          break;
        default:
          value = Math.sin(t + phase);
      }
      
      const x = params.x * this.stage.width() + (i / samples) * params.width * this.stage.width();
      const y = params.y * this.stage.height() - value * params.amplitude * this.stage.height() * 0.1;
      
      points.push(x, y);
    }
    
    const line = new Konva.Line({
      points,
      stroke: '#ff3d71', // Bright red/pink - highly visible
      strokeWidth: 3,
      lineCap: 'round',
      lineJoin: 'round'
    });
    
    // Add grid/axis
    const axis = new Konva.Line({
      points: [
        params.x * this.stage.width(), 
        params.y * this.stage.height(),
        (params.x + params.width) * this.stage.width(),
        params.y * this.stage.height()
      ],
      stroke: '#7dd3fc', // Light blue - visible but subtle
      strokeWidth: 1,
      dash: [5, 5]
    });
    
    this.layer.add(axis);
    
    // Animate waveform drawing with simple opacity fade instead of clip
    if (params.animate !== false) {
      line.opacity(0);
      this.layer.add(line);
      
      await new Promise<void>(resolve => {
        new Konva.Tween({
          node: line,
          opacity: 1,
          duration: 0.5,
          onFinish: resolve
        }).play();
      });
    } else {
      this.layer.add(line);
    }
    
    // Add label
    if (params.label) {
      const label = new Konva.Text({
        x: params.x * this.stage.width(),
        y: (params.y + params.amplitude * 0.12) * this.stage.height(),
        text: params.label,
        fontSize: 12,
        fill: '#2c3e50'
      });
      this.layer.add(label);
    }
  }
  
  /**
   * Draw a connection (wire) between two points
   */
  async drawConnection(params: {
    from: [number, number];
    to: [number, number];
    type?: string;
    color?: string;
    label?: string;
  }): Promise<void> {
    const fromX = params.from[0] * this.stage.width();
    const fromY = params.from[1] * this.stage.height();
    const toX = params.to[0] * this.stage.width();
    const toY = params.to[1] * this.stage.height();
    
    const line = new Konva.Line({
      points: [fromX, fromY, toX, toY],
      stroke: params.color || '#00ff88', // Bright green - highly visible
      strokeWidth: params.type === 'thick' ? 4 : 3,
      lineCap: 'round'
    });
    
    // Add connection dots
    const startDot = new Konva.Circle({
      x: fromX,
      y: fromY,
      radius: 4,
      fill: params.color || '#00ff88'
    });
    
    const endDot = new Konva.Circle({
      x: toX,
      y: toY,
      radius: 4,
      fill: params.color || '#00ff88'
    });
    
    // Animate connection drawing
    line.opacity(0);
    startDot.opacity(0);
    endDot.opacity(0);
    
    this.layer.add(line);
    this.layer.add(startDot);
    this.layer.add(endDot);
    
    await new Promise<void>(resolve => {
      new Konva.Tween({
        node: startDot,
        opacity: 1,
        duration: 0.1,
        onFinish: () => {
          new Konva.Tween({
            node: line,
            opacity: 1,
            duration: 0.2,
            onFinish: () => {
              new Konva.Tween({
                node: endDot,
                opacity: 1,
                duration: 0.1,
                onFinish: resolve
              }).play();
            }
          }).play();
        }
      }).play();
    });
    
    // Add label if provided
    if (params.label) {
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;
      
      const label = new Konva.Text({
        x: midX - 20,
        y: midY - 20,
        text: params.label,
        fontSize: 11,
        fill: '#7f8c8d'
      });
      
      this.layer.add(label);
    }
  }
  
  /**
   * Draw force vector (supports both angle and dx/dy formats)
   */
  async drawForceVector(params: {
    x: number;
    y: number;
    magnitude?: number;
    angle?: number;
    dx?: number;
    dy?: number;
    label?: string;
    color?: string;
  }): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    // Defensive: coerce and validate coordinates (normalized input expected)
    const sx = this.toNum(params.x, 0.5);
    const sy = this.toNum(params.y, 0.5);
    let startX = sx * w;
    let startY = sy * h;
    
    let endX: number;
    let endY: number;
    
    // Support both angle-based and dx/dy-based vectors
    if (params.dx !== undefined && params.dy !== undefined) {
      const dxn = this.toNum(params.dx, 0); // normalized delta in width units
      const dyn = this.toNum(params.dy, 0); // normalized delta in height units
      endX = startX + dxn * w;
      endY = startY + dyn * h;
    } else if (params.angle !== undefined) {
      const length = this.toNum(params.magnitude, 1) * (Math.min(w, h)) * 0.1;
      const ang = this.toNum(params.angle, 0) * Math.PI / 180;
      endX = startX + length * Math.cos(ang);
      endY = startY - length * Math.sin(ang);
    } else {
      // Fallback: short rightwards vector
      endX = startX + Math.max(30, Math.min(80, w * 0.05));
      endY = startY;
    }
    
    // Clamp to stage bounds to avoid NaN/inf propagations
    startX = this.clamp(startX, 0, w);
    startY = this.clamp(startY, 0, h);
    endX = this.clamp(endX, 0, w);
    endY = this.clamp(endY, 0, h);
    
    const arrow = new Konva.Arrow({
      points: [startX, startY, endX, endY],
      stroke: params.color || '#00ff00', // Bright green - highly visible
      strokeWidth: 4,
      fill: params.color || '#00ff00',
      pointerLength: 12,
      pointerWidth: 12
    });
    
    arrow.opacity(0);
    this.layer.add(arrow);
    
    // Animate appearance with timeout safety
    await new Promise<void>(resolve => {
      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };
      
      setTimeout(safeResolve, 400); // 0.3s + buffer
      
      try {
        const tween = new Konva.Tween({
          node: arrow,
          opacity: 1,
          duration: 0.3,
          onFinish: safeResolve
        });
        tween.play();
      } catch (error) {
        console.error('[DomainRenderers] Tween error:', error);
        safeResolve();
      }
    });
    
    // Add label
    if (params.label) {
      const label = new Konva.Text({
        x: endX + 5,
        y: endY - 20,
        text: params.label,
        fontSize: 16,
        fill: '#ffffff', // White text!
        fontStyle: 'bold',
        shadowColor: 'black',
        shadowBlur: 4
      });
      this.layer.add(label);
    }
  }
  
  /**
   * Draw physics object with properties
   */
  async drawPhysicsObject(params: {
    type: string;
    x: number;
    y: number;
    mass?: number;
    velocity?: { x: number; y: number };
    label?: string;
  }): Promise<void> {
    const group = new Konva.Group({
      x: params.x * this.stage.width(),
      y: params.y * this.stage.height()
    });
    
    // Draw object based on type
    let shape;
    switch (params.type) {
      case 'ball':
        shape = new Konva.Circle({
          radius: 20,
          fill: '#3498db',
          stroke: '#2c3e50',
          strokeWidth: 2
        });
        break;
      case 'box':
        shape = new Konva.Rect({
          x: -20,
          y: -20,
          width: 40,
          height: 40,
          fill: '#e74c3c',
          stroke: '#2c3e50',
          strokeWidth: 2
        });
        break;
      default:
        shape = new Konva.Circle({
          radius: 15,
          fill: '#95a5a6',
          stroke: '#2c3e50',
          strokeWidth: 2
        });
    }
    group.add(shape);
    
    // Add mass label if provided
    if (params.mass) {
      group.add(new Konva.Text({
        x: -15,
        y: -8,
        text: `${params.mass}kg`,
        fontSize: 12,
        fill: '#fff',
        fontStyle: 'bold'
      }));
    }
    
    // Add velocity vector if provided
    if (params.velocity) {
      const vx = params.velocity.x * 50;
      const vy = params.velocity.y * 50;
      const velocityArrow = new Konva.Arrow({
        points: [0, 0, vx, -vy],
        stroke: '#f39c12',
        strokeWidth: 2,
        fill: '#f39c12',
        pointerLength: 8,
        pointerWidth: 8
      });
      group.add(velocityArrow);
    }
    
    group.opacity(0);
    this.layer.add(group);
    
    await new Promise<void>(resolve => {
      new Konva.Tween({
        node: group,
        opacity: 1,
        duration: 0.3,
        onFinish: resolve
      }).play();
    });
  }
  
  /**
   * Draw atom (individual)
   */
  async drawAtom(params: {
    element: string;
    x: number;
    y: number;
    electrons?: number;
    showOrbits?: boolean;
  }): Promise<void> {
    const baseX = params.x * this.stage.width();
    const baseY = params.y * this.stage.height();
    
    const group = new Konva.Group({ x: baseX, y: baseY });
    
    const colors: { [key: string]: string } = {
      H: '#ffffff', C: '#2c3e50', O: '#e74c3c',
      N: '#3498db', S: '#f1c40f', P: '#9b59b6'
    };
    
    // Nucleus
    const nucleus = new Konva.Circle({
      radius: 20,
      fill: colors[params.element] || '#95a5a6',
      stroke: '#2c3e50',
      strokeWidth: 2
    });
    group.add(nucleus);
    
    // Element symbol
    group.add(new Konva.Text({
      x: -10,
      y: -10,
      text: params.element,
      fontSize: 20,
      fill: '#fff',
      fontStyle: 'bold'
    }));
    
    // Electron orbits
    if (params.showOrbits && params.electrons) {
      [30, 50, 70].slice(0, Math.ceil(params.electrons / 4)).forEach(radius => {
        group.add(new Konva.Circle({
          radius,
          stroke: '#95a5a6',
          strokeWidth: 1,
          dash: [5, 5]
        }));
      });
      
      // Electrons
      for (let i = 0; i < params.electrons; i++) {
        const angle = (i * 360 / params.electrons) * Math.PI / 180;
        const orbit = i < 2 ? 30 : i < 10 ? 50 : 70;
        group.add(new Konva.Circle({
          x: Math.cos(angle) * orbit,
          y: Math.sin(angle) * orbit,
          radius: 4,
          fill: '#3498db'
        }));
      }
    }
    
    group.opacity(0);
    this.layer.add(group);
    
    await new Promise<void>(resolve => {
      new Konva.Tween({
        node: group,
        opacity: 1,
        duration: 0.4,
        onFinish: resolve
      }).play();
    });
  }
  
  /**
   * Draw data structure (array, tree, graph)
   */
  async drawDataStructure(params: {
    type: string;
    data: any[];
    x: number;
    y: number;
    label?: string;
  }): Promise<void> {
    const baseX = params.x * this.stage.width();
    const baseY = params.y * this.stage.height();
    const group = new Konva.Group({ x: baseX, y: baseY });
    
    if (params.type === 'array') {
      params.data.forEach((val, i) => {
        const rect = new Konva.Rect({
          x: i * 50,
          y: 0,
          width: 45,
          height: 40,
          stroke: '#3498db',
          strokeWidth: 2
        });
        
        const text = new Konva.Text({
          x: i * 50 + 10,
          y: 12,
          text: String(val),
          fontSize: 16,
          fill: '#2c3e50'
        });
        
        group.add(rect, text);
      });
    } else if (params.type === 'linked_list') {
      params.data.forEach((val, i) => {
        const rect = new Konva.Rect({
          x: i * 80,
          y: 0,
          width: 50,
          height: 40,
          stroke: '#3498db',
          strokeWidth: 2,
          cornerRadius: 5
        });
        
        const text = new Konva.Text({
          x: i * 80 + 15,
          y: 12,
          text: String(val),
          fontSize: 16,
          fill: '#2c3e50'
        });
        
        if (i < params.data.length - 1) {
          const arrow = new Konva.Arrow({
            points: [i * 80 + 50, 20, i * 80 + 80, 20],
            stroke: '#95a5a6',
            strokeWidth: 2,
            fill: '#95a5a6',
            pointerLength: 6,
            pointerWidth: 6
          });
          group.add(arrow);
        }
        
        group.add(rect, text);
      });
    }
    
    group.opacity(0);
    this.layer.add(group);
    
    await new Promise<void>(resolve => {
      new Konva.Tween({
        node: group,
        opacity: 1,
        duration: 0.3,
        onFinish: resolve
      }).play();
    });
  }
  
  /**
   * Draw neural network visualization (flexible params)
   */
  async drawNeuralNetwork(params: {
    layers: number[] | number[][];
    x: number;
    y: number;
    width?: number;
    height?: number;
    showWeights?: boolean;
    label?: string;
  }): Promise<void> {
    // Defensive: validate and provide defaults
    const baseX = (isNaN(params.x) ? 0.5 : params.x) * this.stage.width();
    const baseY = (isNaN(params.y) ? 0.5 : params.y) * this.stage.height();
    const width = (params.width || 0.3) * this.stage.width();  // Default 30% width
    const height = (params.height || 0.2) * this.stage.height(); // Default 20% height
    
    // Handle nested array format [[5,5,1],[3,3,6]] → flatten to [5,3,12,10]
    let layerSizes: number[];
    if (params.layers.length > 0 && Array.isArray(params.layers[0])) {
      // Nested format - take first element of each sub-array or sum
      layerSizes = (params.layers as number[][]).map(layer => 
        Array.isArray(layer) ? (layer.length > 0 ? layer[0] : 1) : layer
      );
    } else {
      layerSizes = params.layers as number[];
    }
    
    // Validate layer sizes
    if (!layerSizes || layerSizes.length === 0) {
      console.error('[DomainRenderers] Invalid layers for neural network:', params.layers);
      return; // Skip rendering
    }
    
    const group = new Konva.Group({ x: baseX, y: baseY });
    
    const layerSpacing = width / (layerSizes.length + 1);
    
    layerSizes.forEach((neurons, layerIdx) => {
      const x = layerSpacing * (layerIdx + 1);
      const nodeSpacing = height / (neurons + 1);
      
      // Draw connections to next layer
      if (layerIdx < layerSizes.length - 1) {
        const nextNeurons = layerSizes[layerIdx + 1];
        const nextX = layerSpacing * (layerIdx + 2);
        
        for (let i = 0; i < neurons; i++) {
          const y1 = nodeSpacing * (i + 1);
          for (let j = 0; j < nextNeurons; j++) {
            const y2 = height / (nextNeurons + 1) * (j + 1);
            group.add(new Konva.Line({
              points: [x, y1, nextX, y2],
              stroke: '#00d9ff',  // Bright cyan - visible!
              strokeWidth: 2,
              opacity: 0.5
            }));
          }
        }
      }
      
      // Draw neurons
      for (let i = 0; i < neurons; i++) {
        const y = nodeSpacing * (i + 1);
        group.add(new Konva.Circle({
          x,
          y,
          radius: 15,  // Larger for visibility
          fill: layerIdx === 0 ? '#00d9ff' : layerIdx === layerSizes.length - 1 ? '#00ff88' : '#ff6b9d',  // Bright colors!
          stroke: '#ffffff',
          strokeWidth: 2
        }));
      }
    });
    
    // Add label if provided
    if (params.label) {
      const label = new Konva.Text({
        x: -width / 2,
        y: height + 20,
        text: params.label,
        fontSize: 16,
        fill: '#ffffff',  // White text!
        fontStyle: 'bold',
        width: width,
        align: 'center'
      });
      group.add(label);
    }
    
    group.opacity(0);
    this.layer.add(group);
    
    // Animate with timeout safety
    await new Promise<void>(resolve => {
      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };
      
      setTimeout(safeResolve, 600); // 0.5s + buffer
      
      try {
        const tween = new Konva.Tween({
          node: group,
          opacity: 1,
          duration: 0.5,
          onFinish: safeResolve
        });
        tween.play();
      } catch (error) {
        console.error('[DomainRenderers] drawNeuralNetwork tween error:', error);
        safeResolve();
      }
    });
  }
  
  /**
   * Draw organ system (heart, lungs, digestive system, etc.)
   */
  async drawOrganSystem(params: {
    type: string;
    x: number;
    y: number;
    size?: number;
    showLabels?: boolean;
  }): Promise<void> {
    const baseX = params.x * this.stage.width();
    const baseY = params.y * this.stage.height();
    const size = (params.size || 0.3) * this.stage.width();
    
    const group = new Konva.Group({ x: baseX, y: baseY });
    
    switch (params.type.toLowerCase()) {
      case 'heart':
        // Draw stylized heart shape
        const heartPath = new Konva.Path({
          data: 'M0,-20 C-25,-40 -40,-20 -40,0 C-40,20 0,40 0,50 C0,40 40,20 40,0 C40,-20 25,-40 0,-20 Z',
          fill: '#e74c3c',
          stroke: '#c0392b',
          strokeWidth: 2,
          scale: { x: size / 80, y: size / 80 }
        });
        group.add(heartPath);
        
        // Add chambers
        group.add(new Konva.Line({
          points: [-20, -10, -20, 20],
          stroke: '#95a5a6',
          strokeWidth: 2,
          dash: [5, 5]
        }));
        
        group.add(new Konva.Line({
          points: [20, -10, 20, 20],
          stroke: '#95a5a6',
          strokeWidth: 2,
          dash: [5, 5]
        }));
        break;
        
      case 'lungs':
        // Draw lung shapes
        const leftLung = new Konva.Shape({
          sceneFunc: (context, shape) => {
            context.beginPath();
            context.ellipse(-size/3, 0, size/4, size/2, 0, 0, Math.PI * 2);
            context.fillStrokeShape(shape);
          },
          fill: '#3498db',
          stroke: '#2980b9',
          strokeWidth: 2,
          opacity: 0.7
        });
        
        const rightLung = new Konva.Shape({
          sceneFunc: (context, shape) => {
            context.beginPath();
            context.ellipse(size/3, 0, size/4, size/2, 0, 0, Math.PI * 2);
            context.fillStrokeShape(shape);
          },
          fill: '#3498db',
          stroke: '#2980b9',
          strokeWidth: 2,
          opacity: 0.7
        });
        
        group.add(leftLung, rightLung);
        
        // Add trachea
        group.add(new Konva.Rect({
          x: -10,
          y: -size/2,
          width: 20,
          height: size/3,
          fill: '#95a5a6',
          cornerRadius: 5
        }));
        break;
        
      case 'plant':
      case 'leaf':
        // Draw leaf shape for photosynthesis
        const leaf = new Konva.Shape({
          sceneFunc: (context, shape) => {
            context.beginPath();
            context.moveTo(0, -size/2);
            context.quadraticCurveTo(size/2, -size/4, size/2, 0);
            context.quadraticCurveTo(size/2, size/4, 0, size/2);
            context.quadraticCurveTo(-size/2, size/4, -size/2, 0);
            context.quadraticCurveTo(-size/2, -size/4, 0, -size/2);
            context.fillStrokeShape(shape);
          },
          fill: '#27ae60',
          stroke: '#229954',
          strokeWidth: 2
        });
        group.add(leaf);
        
        // Add veins
        group.add(new Konva.Line({
          points: [0, -size/2, 0, size/2],
          stroke: '#1e8449',
          strokeWidth: 2
        }));
        break;
        
      default:
        // Generic organ shape
        const organ = new Konva.Circle({
          radius: size/2,
          fill: '#e67e22',
          stroke: '#d35400',
          strokeWidth: 2,
          opacity: 0.8
        });
        group.add(organ);
    }
    
    group.opacity(0);
    this.layer.add(group);
    
    await new Promise<void>(resolve => {
      new Konva.Tween({
        node: group,
        opacity: 1,
        duration: 0.5,
        onFinish: resolve
      }).play();
    });
  }
  
  /**
   * Draw membrane structure
   */
  async drawMembrane(params: {
    type: string;
    x: number;
    y: number;
    width: number;
    showChannels?: boolean;
  }): Promise<void> {
    const baseX = params.x * this.stage.width();
    const baseY = params.y * this.stage.height();
    const width = params.width * this.stage.width();
    
    const group = new Konva.Group({ x: baseX, y: baseY });
    
    // Draw phospholipid bilayer
    const lipidCount = Math.floor(width / 20);
    
    // Top layer (heads pointing up)
    for (let i = 0; i < lipidCount; i++) {
      const x = (i - lipidCount/2) * 20;
      
      // Head (circle)
      group.add(new Konva.Circle({
        x,
        y: -15,
        radius: 5,
        fill: '#f39c12',
        stroke: '#e67e22',
        strokeWidth: 1
      }));
      
      // Tail (lines)
      group.add(new Konva.Line({
        points: [x, -10, x - 3, 0],
        stroke: '#95a5a6',
        strokeWidth: 2
      }));
      
      group.add(new Konva.Line({
        points: [x, -10, x + 3, 0],
        stroke: '#95a5a6',
        strokeWidth: 2
      }));
    }
    
    // Bottom layer (heads pointing down)
    for (let i = 0; i < lipidCount; i++) {
      const x = (i - lipidCount/2) * 20;
      
      // Tail
      group.add(new Konva.Line({
        points: [x, 0, x - 3, 10],
        stroke: '#95a5a6',
        strokeWidth: 2
      }));
      
      group.add(new Konva.Line({
        points: [x, 0, x + 3, 10],
        stroke: '#95a5a6',
        strokeWidth: 2
      }));
      
      // Head
      group.add(new Konva.Circle({
        x,
        y: 15,
        radius: 5,
        fill: '#f39c12',
        stroke: '#e67e22',
        strokeWidth: 1
      }));
    }
    
    // Add protein channels if requested
    if (params.showChannels) {
      const channelCount = 2;
      for (let i = 0; i < channelCount; i++) {
        const x = (i - channelCount/2 + 0.5) * (width / channelCount);
        
        group.add(new Konva.Rect({
          x: x - 10,
          y: -20,
          width: 20,
          height: 40,
          fill: '#9b59b6',
          stroke: '#8e44ad',
          strokeWidth: 2,
          cornerRadius: 5,
          opacity: 0.8
        }));
      }
    }
    
    group.opacity(0);
    this.layer.add(group);
    
    await new Promise<void>(resolve => {
      new Konva.Tween({
        node: group,
        opacity: 1,
        duration: 0.5,
        onFinish: resolve
      }).play();
    });
  }
  
  /**
   * Draw chemical reaction
   */
  async drawReaction(params: {
    reactants: string[];
    products: string[];
    x: number;
    y: number;
    type?: string;
  }): Promise<void> {
    const baseX = params.x * this.stage.width();
    const baseY = params.y * this.stage.height();
    
    const group = new Konva.Group({ x: baseX, y: baseY });
    
    // Draw reactants
    const reactantSpacing = 80;
    params.reactants.forEach((reactant, i) => {
      const x = (i - params.reactants.length/2 + 0.5) * reactantSpacing - 100;
      
      // Molecule representation
      group.add(new Konva.Circle({
        x,
        y: 0,
        radius: 25,
        fill: '#3498db',
        stroke: '#2980b9',
        strokeWidth: 2
      }));
      
      group.add(new Konva.Text({
        x: x - 20,
        y: -8,
        text: reactant,
        fontSize: 14,
        fill: '#fff',
        fontStyle: 'bold',
        width: 40,
        align: 'center'
      }));
    });
    
    // Draw arrow
    group.add(new Konva.Arrow({
      points: [-50, 0, 50, 0],
      stroke: '#e74c3c',
      strokeWidth: 3,
      fill: '#e74c3c',
      pointerLength: 15,
      pointerWidth: 15
    }));
    
    // Add energy label if exothermic/endothermic
    if (params.type === 'exothermic') {
      group.add(new Konva.Text({
        x: -25,
        y: -30,
        text: '+ Energy',
        fontSize: 12,
        fill: '#e74c3c',
        fontStyle: 'italic'
      }));
    } else if (params.type === 'endothermic') {
      group.add(new Konva.Text({
        x: -25,
        y: -30,
        text: '- Energy',
        fontSize: 12,
        fill: '#3498db',
        fontStyle: 'italic'
      }));
    }
    
    // Draw products
    params.products.forEach((product, i) => {
      const x = (i - params.products.length/2 + 0.5) * reactantSpacing + 100;
      
      // Molecule representation
      group.add(new Konva.Circle({
        x,
        y: 0,
        radius: 25,
        fill: '#27ae60',
        stroke: '#229954',
        strokeWidth: 2
      }));
      
      group.add(new Konva.Text({
        x: x - 20,
        y: -8,
        text: product,
        fontSize: 14,
        fill: '#fff',
        fontStyle: 'bold',
        width: 40,
        align: 'center'
      }));
    });
    
    group.opacity(0);
    this.layer.add(group);
    
    await new Promise<void>(resolve => {
      new Konva.Tween({
        node: group,
        opacity: 1,
        duration: 0.5,
        onFinish: resolve
      }).play();
    });
  }
  
  /**
   * Generic animate operation
   */
  async animate(params: {
    target?: string;
    type: string;
    duration?: number;
    x?: number;
    y?: number;
  }): Promise<void> {
    // For now, create a simple animated indicator
    const x = (params.x || 0.5) * this.stage.width();
    const y = (params.y || 0.5) * this.stage.height();
    const duration = params.duration || 1000;
    
    const shape = new Konva.Circle({
      x,
      y,
      radius: 30,
      fill: '#3498db',
      opacity: 0.5
    });
    
    this.layer.add(shape);
    
    // Pulse animation
    await new Promise<void>(resolve => {
      const anim = new Konva.Tween({
        node: shape,
        radius: 50,
        opacity: 0,
        duration: duration / 1000,
        onFinish: () => {
          shape.destroy();
          resolve();
        }
      });
      anim.play();
    });
  }
  
  /**
   * Draw molecule structure
   */
  async drawMolecule(params: {
    atoms: Array<{ element: string; x: number; y: number }>;
    bonds: Array<{ from: number; to: number; type: 'single' | 'double' | 'triple' }>;
    x: number;
    y: number;
    scale?: number;
  }): Promise<void> {
    const baseX = params.x * this.stage.width();
    const baseY = params.y * this.stage.height();
    const scale = (params.scale || 1) * this.stage.width() * 0.1;
    
    const group = new Konva.Group({
      x: baseX,
      y: baseY
    });
    
    // Atom colors
    const atomColors: { [key: string]: string } = {
      H: '#ffffff',
      C: '#2c3e50',
      O: '#e74c3c',
      N: '#3498db',
      S: '#f1c40f',
      P: '#9b59b6',
      Cl: '#27ae60',
      F: '#95a5a6'
    };
    
    // Draw bonds first (behind atoms)
    for (const bond of params.bonds) {
      const fromAtom = params.atoms[bond.from];
      const toAtom = params.atoms[bond.to];
      
      if (bond.type === 'double') {
        // Draw double bond
        group.add(new Konva.Line({
          points: [
            fromAtom.x * scale - 2, fromAtom.y * scale,
            toAtom.x * scale - 2, toAtom.y * scale
          ],
          stroke: '#34495e',
          strokeWidth: 2
        }));
        
        group.add(new Konva.Line({
          points: [
            fromAtom.x * scale + 2, fromAtom.y * scale,
            toAtom.x * scale + 2, toAtom.y * scale
          ],
          stroke: '#34495e',
          strokeWidth: 2
        }));
      } else if (bond.type === 'triple') {
        // Draw triple bond
        for (let i = -2; i <= 2; i += 2) {
          group.add(new Konva.Line({
            points: [
              fromAtom.x * scale + i, fromAtom.y * scale,
              toAtom.x * scale + i, toAtom.y * scale
            ],
            stroke: '#34495e',
            strokeWidth: 2
          }));
        }
      } else {
        // Single bond
        group.add(new Konva.Line({
          points: [
            fromAtom.x * scale, fromAtom.y * scale,
            toAtom.x * scale, toAtom.y * scale
          ],
          stroke: '#34495e',
          strokeWidth: 2
        }));
      }
    }
    
    // Draw atoms
    for (const atom of params.atoms) {
      const circle = new Konva.Circle({
        x: atom.x * scale,
        y: atom.y * scale,
        radius: 15,
        fill: atomColors[atom.element] || '#95a5a6',
        stroke: '#2c3e50',
        strokeWidth: 2
      });
      
      const text = new Konva.Text({
        x: atom.x * scale - 8,
        y: atom.y * scale - 8,
        text: atom.element,
        fontSize: 16,
        fill: atom.element === 'C' ? '#fff' : '#2c3e50',
        fontStyle: 'bold'
      });
      
      group.add(circle);
      group.add(text);
    }
    
    group.opacity(0);
    this.layer.add(group);
    
    // Animate appearance
    await new Promise<void>(resolve => {
      new Konva.Tween({
        node: group,
        opacity: 1,
        duration: 0.5,
        onFinish: resolve
      }).play();
    });
  }
  
  // ===================== MISSING V2 OPERATIONS - IMPLEMENT NOW =====================
  
  /**
   * Draw a flowchart with nodes and connections
   */
  async drawFlowchart(params: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    const x = this.toNum(params.x, 0.5) * w;
    const y = this.toNum(params.y, 0.5) * h;
    
    const group = new Konva.Group({ x, y });
    
    // Draw nodes
    if (params.nodes && Array.isArray(params.nodes)) {
      params.nodes.forEach((node: any, i: number) => {
        const nodeX = this.toNum(node.x, 0.5) * w;
        const nodeY = this.toNum(node.y, 0.5) * h;
        
        // Node rectangle
        const rect = new Konva.Rect({
          x: nodeX - 40,
          y: nodeY - 20,
          width: 80,
          height: 40,
          fill: node.type === 'decision' ? '#f39c12' : '#3498db',
          stroke: '#2c3e50',
          strokeWidth: 2,
          cornerRadius: node.type === 'decision' ? 0 : 5
        });
        group.add(rect);
        
        // Label
        if (node.label) {
          const text = new Konva.Text({
            x: nodeX - 35,
            y: nodeY - 8,
            text: node.label,
            fontSize: 12,
            fill: 'white',
            width: 70,
            align: 'center'
          });
          group.add(text);
        }
      });
      
      // Draw connections
      if (params.connections && Array.isArray(params.connections)) {
        params.connections.forEach((conn: any) => {
          const fromNode = params.nodes[conn.from];
          const toNode = params.nodes[conn.to];
          if (fromNode && toNode) {
            const arrow = new Konva.Arrow({
              points: [
                this.toNum(fromNode.x, 0.5) * w,
                this.toNum(fromNode.y, 0.5) * h + 20,
                this.toNum(toNode.x, 0.5) * w,
                this.toNum(toNode.y, 0.5) * h - 20
              ],
              stroke: '#34495e',
              strokeWidth: 2,
              pointerLength: 8,
              pointerWidth: 8,
              fill: '#34495e'
            });
            group.add(arrow);
          }
        });
      }
    }
    
    this.layer.add(group);
    this.layer.batchDraw();
  }
  
  /**
   * Draw a coordinate system (cartesian, polar, 3D)
   */
  async drawCoordinateSystem(params: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    const x = this.toNum(params.x, 0.5) * w;
    const y = this.toNum(params.y, 0.5) * h;
    const width = this.toNum(params.width, 0.3) * w;
    const height = this.toNum(params.height, 0.3) * h;
    
    const group = new Konva.Group({ x, y });
    
    // Draw axes
    const xAxis = new Konva.Line({
      points: [0, height / 2, width, height / 2],
      stroke: '#2c3e50',
      strokeWidth: 2
    });
    group.add(xAxis);
    
    const yAxis = new Konva.Line({
      points: [width / 2, 0, width / 2, height],
      stroke: '#2c3e50',
      strokeWidth: 2
    });
    group.add(yAxis);
    
    // Add grid if specified
    if (params.showGrid !== false) {
      const gridSpacing = width / 10;
      for (let i = 1; i < 10; i++) {
        // Vertical lines
        const vLine = new Konva.Line({
          points: [i * gridSpacing, 0, i * gridSpacing, height],
          stroke: '#ecf0f1',
          strokeWidth: 1
        });
        group.add(vLine);
        
        // Horizontal lines
        const hLine = new Konva.Line({
          points: [0, i * gridSpacing, width, i * gridSpacing],
          stroke: '#ecf0f1',
          strokeWidth: 1
        });
        group.add(hLine);
      }
    }
    
    // Add axis labels
    if (params.xLabel) {
      const xLabel = new Konva.Text({
        x: width - 20,
        y: height / 2 + 10,
        text: params.xLabel,
        fontSize: 14,
        fill: '#2c3e50'
      });
      group.add(xLabel);
    }
    
    if (params.yLabel) {
      const yLabel = new Konva.Text({
        x: width / 2 + 10,
        y: 5,
        text: params.yLabel,
        fontSize: 14,
        fill: '#2c3e50'
      });
      group.add(yLabel);
    }
    
    this.layer.add(group);
    this.layer.batchDraw();
  }
  
  /**
   * Draw geometric shapes (triangles, polygons, etc.)
   */
  async drawGeometry(params: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    const x = this.toNum(params.x, 0.5) * w;
    const y = this.toNum(params.y, 0.5) * h;
    const size = this.toNum(params.size, 50);
    
    let shape: Konva.Shape;
    
    switch (params.type) {
      case 'triangle':
        shape = new Konva.RegularPolygon({
          x, y,
          sides: 3,
          radius: size,
          fill: params.fill || 'transparent',
          stroke: params.color || '#3498db',
          strokeWidth: 3
        });
        break;
      case 'square':
        shape = new Konva.Rect({
          x: x - size / 2,
          y: y - size / 2,
          width: size,
          height: size,
          fill: params.fill || 'transparent',
          stroke: params.color || '#3498db',
          strokeWidth: 3
        });
        break;
      case 'pentagon':
        shape = new Konva.RegularPolygon({
          x, y,
          sides: 5,
          radius: size,
          fill: params.fill || 'transparent',
          stroke: params.color || '#3498db',
          strokeWidth: 3
        });
        break;
      case 'hexagon':
        shape = new Konva.RegularPolygon({
          x, y,
          sides: 6,
          radius: size,
          fill: params.fill || 'transparent',
          stroke: params.color || '#3498db',
          strokeWidth: 3
        });
        break;
      default:
        shape = new Konva.Circle({
          x, y,
          radius: size,
          fill: params.fill || 'transparent',
          stroke: params.color || '#3498db',
          strokeWidth: 3
        });
    }
    
    if (params.label) {
      const group = new Konva.Group();
      group.add(shape);
      
      const text = new Konva.Text({
        x: x - 20,
        y: y + size + 10,
        text: params.label,
        fontSize: 14,
        fill: '#2c3e50',
        width: 40,
        align: 'center'
      });
      group.add(text);
      
      this.layer.add(group);
    } else {
      this.layer.add(shape);
    }
    
    this.layer.batchDraw();
  }
  
  /**
   * Draw algorithm step visualization
   */
  async drawAlgorithmStep(params: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    const x = this.toNum(params.x, 0.5) * w;
    const y = this.toNum(params.y, 0.5) * h;
    
    const group = new Konva.Group({ x, y });
    
    // Step box
    const box = new Konva.Rect({
      x: 0,
      y: 0,
      width: 200,
      height: 60,
      fill: '#ecf0f1',
      stroke: '#3498db',
      strokeWidth: 2,
      cornerRadius: 5
    });
    group.add(box);
    
    // Step number
    if (params.stepNumber) {
      const num = new Konva.Circle({
        x: 20,
        y: 30,
        radius: 15,
        fill: '#3498db'
      });
      group.add(num);
      
      const numText = new Konva.Text({
        x: 13,
        y: 22,
        text: String(params.stepNumber),
        fontSize: 16,
        fill: 'white',
        fontStyle: 'bold'
      });
      group.add(numText);
    }
    
    // Description
    if (params.description) {
      const desc = new Konva.Text({
        x: 45,
        y: 20,
        text: params.description,
        fontSize: 12,
        fill: '#2c3e50',
        width: 145,
        wrap: 'word'
      });
      group.add(desc);
    }
    
    this.layer.add(group);
    this.layer.batchDraw();
  }
  
  /**
   * Draw trajectory path
   */
  async drawTrajectory(params: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    
    // Build points array from params
    const points: number[] = [];
    if (params.points && Array.isArray(params.points)) {
      params.points.forEach((pt: any) => {
        points.push(this.toNum(pt.x || pt[0], 0.5) * w);
        points.push(this.toNum(pt.y || pt[1], 0.5) * h);
      });
    } else if (params.path) {
      // Handle path - can be string or array of points
      if (typeof params.path === 'string') {
        // Parse path string if provided
        const pathPoints = params.path.split(' ');
        for (let i = 0; i < pathPoints.length; i += 2) {
          points.push(parseFloat(pathPoints[i]) * w);
          points.push(parseFloat(pathPoints[i + 1]) * h);
        }
      } else if (Array.isArray(params.path)) {
        // Path is already an array of points
        params.path.forEach((pt: any) => {
          if (Array.isArray(pt)) {
            points.push(this.toNum(pt[0], 0.5) * w);
            points.push(this.toNum(pt[1], 0.5) * h);
          }
        });
      }
    }
    
    if (points.length < 4) {
      // Need at least 2 points
      console.warn('[DomainRenderers] drawTrajectory: insufficient points');
      return;
    }
    
    const line = new Konva.Line({
      points,
      stroke: params.color || '#e74c3c',
      strokeWidth: 3,
      lineCap: 'round',
      lineJoin: 'round',
      dash: params.dashed ? [10, 5] : undefined
    });
    
    this.layer.add(line);
    
    // Add arrow at end if specified
    if (params.showArrow !== false) {
      const lastIdx = points.length - 2;
      const prevIdx = points.length - 4;
      
      const angle = Math.atan2(
        points[lastIdx + 1] - points[prevIdx + 1],
        points[lastIdx] - points[prevIdx]
      );
      
      const arrowSize = 10;
      const arrow = new Konva.Line({
        points: [
          points[lastIdx], points[lastIdx + 1],
          points[lastIdx] - arrowSize * Math.cos(angle - Math.PI / 6), points[lastIdx + 1] - arrowSize * Math.sin(angle - Math.PI / 6),
          points[lastIdx], points[lastIdx + 1],
          points[lastIdx] - arrowSize * Math.cos(angle + Math.PI / 6), points[lastIdx + 1] - arrowSize * Math.sin(angle + Math.PI / 6)
        ],
        stroke: params.color || '#e74c3c',
        strokeWidth: 3,
        lineCap: 'round',
        fill: params.color || '#e74c3c',
        closed: true
      });
      this.layer.add(arrow);
    }
    
    this.layer.batchDraw();
  }
  
  /**
   * Draw field lines (electric, magnetic, etc.)
   */
  async drawFieldLines(params: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    const centerX = this.toNum(params.x, 0.5) * w;
    const centerY = this.toNum(params.y, 0.5) * h;
    const numLines = params.numLines || 8;
    const length = this.toNum(params.length, 0.2) * Math.min(w, h);
    
    const group = new Konva.Group({ x: centerX, y: centerY });
    
    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * 2 * Math.PI;
      const endX = length * Math.cos(angle);
      const endY = length * Math.sin(angle);
      
      const line = new Konva.Arrow({
        points: [0, 0, endX, endY],
        stroke: params.color || '#f39c12',
        strokeWidth: 2,
        pointerLength: 8,
        pointerWidth: 8,
        fill: params.color || '#f39c12'
      });
      
      group.add(line);
    }
    
    // Add source circle
    const source = new Konva.Circle({
      x: 0,
      y: 0,
      radius: 10,
      fill: params.color || '#f39c12',
      stroke: '#2c3e50',
      strokeWidth: 2
    });
    group.add(source);
    
    this.layer.add(group);
    this.layer.batchDraw();
  }
  
  /**
   * Draw cell structure (biology)
   */
  async drawCellStructure(params: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    const x = this.toNum(params.x, 0.5) * w;
    const y = this.toNum(params.y, 0.5) * h;
    const radius = this.toNum(params.radius, 80);
    
    const group = new Konva.Group({ x, y });
    
    // Cell membrane
    const membrane = new Konva.Circle({
      x: 0,
      y: 0,
      radius,
      stroke: '#27ae60',
      strokeWidth: 3,
      fill: 'rgba(39, 174, 96, 0.1)'
    });
    group.add(membrane);
    
    // Nucleus
    const nucleus = new Konva.Circle({
      x: 0,
      y: 0,
      radius: radius * 0.4,
      fill: 'rgba(52, 152, 219, 0.3)',
      stroke: '#3498db',
      strokeWidth: 2
    });
    group.add(nucleus);
    
    // Mitochondria
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * 2 * Math.PI;
      const dist = radius * 0.6;
      const mito = new Konva.Ellipse({
        x: dist * Math.cos(angle),
        y: dist * Math.sin(angle),
        radiusX: 15,
        radiusY: 8,
        fill: 'rgba(231, 76, 60, 0.3)',
        stroke: '#e74c3c',
        strokeWidth: 1,
        rotation: angle * 180 / Math.PI
      });
      group.add(mito);
    }
    
    // Label
    if (params.label) {
      const text = new Konva.Text({
        x: -radius,
        y: radius + 15,
        text: params.label,
        fontSize: 14,
        fill: '#2c3e50',
        width: radius * 2,
        align: 'center'
      });
      group.add(text);
    }
    
    this.layer.add(group);
    this.layer.batchDraw();
  }
  
  /**
   * Draw molecular structure
   */
  async drawMolecularStructure(params: any): Promise<void> {
    // Similar to drawMolecule but with more complex structures
    await this.drawMolecule(params);
  }
  
  /**
   * Draw chemical bond
   */
  async drawBond(params: any): Promise<void> {
    const w = this.stage.width();
    const h = this.stage.height();
    const x1 = this.toNum(params.from?.[0] || params.x1, 0.3) * w;
    const y1 = this.toNum(params.from?.[1] || params.y1, 0.5) * h;
    const x2 = this.toNum(params.to?.[0] || params.x2, 0.7) * w;
    const y2 = this.toNum(params.to?.[1] || params.y2, 0.5) * h;
    
    const bondType = params.type || params.bondType || 'single';
    
    if (bondType === 'double') {
      // Double bond - two parallel lines
      const offset = 3;
      const line1 = new Konva.Line({
        points: [x1, y1 - offset, x2, y2 - offset],
        stroke: '#34495e',
        strokeWidth: 2
      });
      const line2 = new Konva.Line({
        points: [x1, y1 + offset, x2, y2 + offset],
        stroke: '#34495e',
        strokeWidth: 2
      });
      this.layer.add(line1);
      this.layer.add(line2);
    } else if (bondType === 'triple') {
      // Triple bond
      const offset = 4;
      const line1 = new Konva.Line({
        points: [x1, y1 - offset, x2, y2 - offset],
        stroke: '#34495e',
        strokeWidth: 2
      });
      const line2 = new Konva.Line({
        points: [x1, y1, x2, y2],
        stroke: '#34495e',
        strokeWidth: 2
      });
      const line3 = new Konva.Line({
        points: [x1, y1 + offset, x2, y2 + offset],
        stroke: '#34495e',
        strokeWidth: 2
      });
      this.layer.add(line1);
      this.layer.add(line2);
      this.layer.add(line3);
    } else {
      // Single bond
      const line = new Konva.Line({
        points: [x1, y1, x2, y2],
        stroke: '#34495e',
        strokeWidth: 3
      });
      this.layer.add(line);
    }
    
    this.layer.batchDraw();
  }
}
