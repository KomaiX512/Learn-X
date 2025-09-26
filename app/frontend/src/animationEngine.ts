import Konva from 'konva';
import { PhysicsEngine } from './physics/physicsEngine';
import { ParticleSystem } from './physics/particleSystem';
import { AnimationPresets } from './animations/presets';
import { Timeline } from './animations/timeline';

// Core Animation Engine for 3Blue1Brown-style educational animations
export interface AnimationContext {
  stage: Konva.Stage;
  layer: Konva.Layer;
  width: number;
  height: number;
  time: number;
  deltaTime: number;
}

export class AnimationEngine {
  private physics: PhysicsEngine;
  private timeline: Timeline;
  private presets: AnimationPresets;
  private particleSystems: Map<string, ParticleSystem> = new Map();
  private animations: Map<string, Konva.Animation> = new Map();
  private stage: Konva.Stage | null = null;
  private layers: Map<string, Konva.Layer> = new Map();

  constructor() {
    this.physics = new PhysicsEngine();
    this.timeline = new Timeline();
    this.presets = new AnimationPresets(this);
  }

  init(stage: Konva.Stage) {
    this.stage = stage;
    console.log('[AnimationEngine] Initialized with stage:', stage.width(), 'x', stage.height());
  }

  createLayer(id: string): Konva.Layer {
    if (!this.stage) throw new Error('Stage not initialized');
    
    let layer = this.layers.get(id);
    if (!layer) {
      layer = new Konva.Layer();
      this.stage.add(layer);
      this.layers.set(id, layer);
    }
    return layer;
  }

  // Main animation creation method - intelligently creates animations based on topic
  async createAnimation(topic: string, config: any, layer: Konva.Layer): Promise<string> {
    const animationId = `anim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Detect animation type from topic keywords
    const lowerTopic = topic.toLowerCase();
    
    if (lowerTopic.includes('solar') || lowerTopic.includes('planet') || lowerTopic.includes('orbit')) {
      return this.presets.createSolarSystem(layer, config);
    } else if (lowerTopic.includes('circuit') || lowerTopic.includes('electric') || lowerTopic.includes('current')) {
      return this.presets.createElectricCircuit(layer, config);
    } else if (lowerTopic.includes('wave') || lowerTopic.includes('sound') || lowerTopic.includes('light')) {
      return this.presets.createWave(layer, config);
    } else if (lowerTopic.includes('pendulum')) {
      if (lowerTopic.includes('double') || lowerTopic.includes('chaos')) {
        return this.presets.createDoublePendulum(layer, config);
      }
      return this.presets.createPendulum(layer, config);
    } else if (lowerTopic.includes('spring') || lowerTopic.includes('oscillat')) {
      return this.presets.createSpring(layer, config);
    } else if (lowerTopic.includes('particle') || lowerTopic.includes('atom') || lowerTopic.includes('molecule')) {
      return this.presets.createParticleSimulation(layer, config);
    } else if (lowerTopic.includes('graph') || lowerTopic.includes('function') || lowerTopic.includes('equation')) {
      return this.presets.createAnimatedGraph(layer, config);
    } else if (lowerTopic.includes('vector') || lowerTopic.includes('field')) {
      return this.presets.createVectorField(layer, config);
    } else if (lowerTopic.includes('fractal') || lowerTopic.includes('mandelbrot') || lowerTopic.includes('julia')) {
      return this.presets.createFractal(layer, config);
    } else if (lowerTopic.includes('fluid') || lowerTopic.includes('flow') || lowerTopic.includes('vortex')) {
      return this.presets.createFluidFlow(layer, config);
    }
    
    // Default: create a generic animated visualization
    return this.presets.createGenericAnimation(layer, config);
  }

  // Timeline control methods
  play() {
    this.timeline.play();
  }

  pause() {
    this.timeline.pause();
  }

  seek(time: number) {
    this.timeline.seek(time);
  }

  // Add sequenced animation
  addSequence(sequence: {
    start: number;
    duration: number;
    animation: (progress: number, layer: Konva.Layer) => void;
  }) {
    this.timeline.addSequence(sequence);
  }

  // Particle system management
  createParticleSystem(id: string, config: any): ParticleSystem {
    const system = new ParticleSystem(config);
    this.particleSystems.set(id, system);
    return system;
  }

  // Physics simulation
  addPhysicsObject(object: any) {
    this.physics.addObject(object);
  }

  updatePhysics(deltaTime: number) {
    this.physics.update(deltaTime);
  }

  // Cleanup
  clearAnimation(id: string) {
    const animation = this.animations.get(id);
    if (animation) {
      animation.stop();
      this.animations.delete(id);
    }
    
    const particleSystem = this.particleSystems.get(id);
    if (particleSystem) {
      particleSystem.destroy();
      this.particleSystems.delete(id);
    }
  }

  clearAll() {
    this.animations.forEach(anim => anim.stop());
    this.animations.clear();
    
    this.particleSystems.forEach(system => system.destroy());
    this.particleSystems.clear();
    
    this.layers.forEach(layer => layer.destroy());
    this.layers.clear();
    
    this.timeline.clear();
    this.physics.clear();
  }

  // Export for global access
  static instance: AnimationEngine | null = null;
  
  static getInstance(): AnimationEngine {
    if (!AnimationEngine.instance) {
      AnimationEngine.instance = new AnimationEngine();
    }
    return AnimationEngine.instance;
  }
}

// Export singleton instance
export const animationEngine = AnimationEngine.getInstance();
