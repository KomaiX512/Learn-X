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
    
    // Animate appearance
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
    
    // Animate waveform drawing
    if (params.animate !== false) {
      const clipPath = new Konva.Rect({
        x: params.x * this.stage.width(),
        y: (params.y - params.amplitude * 0.15) * this.stage.height(),
        width: 0,
        height: params.amplitude * 0.3 * this.stage.height()
      });
      
      // TypeScript fix: use type assertion
      (line as any).clipFunc((ctx: CanvasRenderingContext2D) => {
        ctx.rect(
          params.x * this.stage.width(),
          (params.y - params.amplitude * 0.15) * this.stage.height(),
          clipPath.width(),
          params.amplitude * 0.3 * this.stage.height()
        );
      });
      
      this.layer.add(line);
      
      await new Promise<void>(resolve => {
        new Konva.Tween({
          node: clipPath,
          width: params.width * this.stage.width(),
          duration: 0.8,
          onUpdate: () => (line as any).clipFunc((ctx: CanvasRenderingContext2D) => {
            ctx.rect(
              params.x * this.stage.width(),
              (params.y - params.amplitude * 0.15) * this.stage.height(),
              clipPath.width(),
              params.amplitude * 0.3 * this.stage.height()
            );
          }),
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
   * Draw force vector
   */
  async drawForceVector(params: {
    x: number;
    y: number;
    magnitude: number;
    angle: number;
    label?: string;
    color?: string;
  }): Promise<void> {
    const startX = params.x * this.stage.width();
    const startY = params.y * this.stage.height();
    const length = params.magnitude * this.stage.width() * 0.1;
    const endX = startX + length * Math.cos(params.angle * Math.PI / 180);
    const endY = startY - length * Math.sin(params.angle * Math.PI / 180);
    
    const arrow = new Konva.Arrow({
      points: [startX, startY, endX, endY],
      stroke: params.color || '#e74c3c',
      strokeWidth: 3,
      fill: params.color || '#e74c3c',
      pointerLength: 10,
      pointerWidth: 10
    });
    
    arrow.opacity(0);
    this.layer.add(arrow);
    
    // Animate appearance
    await new Promise<void>(resolve => {
      new Konva.Tween({
        node: arrow,
        opacity: 1,
        duration: 0.3,
        onFinish: resolve
      }).play();
    });
    
    // Add label
    if (params.label) {
      const label = new Konva.Text({
        x: endX + 5,
        y: endY - 20,
        text: params.label,
        fontSize: 14,
        fill: params.color || '#e74c3c',
        fontStyle: 'bold'
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
   * Draw neural network visualization
   */
  async drawNeuralNetwork(params: {
    layers: number[];
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<void> {
    const baseX = params.x * this.stage.width();
    const baseY = params.y * this.stage.height();
    const width = params.width * this.stage.width();
    const height = params.height * this.stage.height();
    
    const group = new Konva.Group({ x: baseX, y: baseY });
    
    const layerSpacing = width / (params.layers.length + 1);
    
    params.layers.forEach((neurons, layerIdx) => {
      const x = layerSpacing * (layerIdx + 1);
      const nodeSpacing = height / (neurons + 1);
      
      // Draw connections to next layer
      if (layerIdx < params.layers.length - 1) {
        const nextNeurons = params.layers[layerIdx + 1];
        const nextX = layerSpacing * (layerIdx + 2);
        
        for (let i = 0; i < neurons; i++) {
          const y1 = nodeSpacing * (i + 1);
          for (let j = 0; j < nextNeurons; j++) {
            const y2 = height / (nextNeurons + 1) * (j + 1);
            group.add(new Konva.Line({
              points: [x, y1, nextX, y2],
              stroke: '#bdc3c7',
              strokeWidth: 1,
              opacity: 0.3
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
          radius: 12,
          fill: layerIdx === 0 ? '#3498db' : layerIdx === params.layers.length - 1 ? '#e74c3c' : '#95a5a6',
          stroke: '#2c3e50',
          strokeWidth: 2
        }));
      }
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
}
