import Konva from 'konva';

export interface ParticleConfig {
  x: number;
  y: number;
  particleCount: number;
  particleSize: number;
  particleColor: string | string[];
  particleSpeed: number;
  emissionRate: number;
  lifetime: number;
  spread?: number; // Angle spread for emission
  gravity?: number;
  wind?: { x: number; y: number };
  fadeOut?: boolean;
  glow?: boolean;
  path?: { x: number; y: number }[]; // For following a path
  emissionShape?: 'point' | 'line' | 'circle' | 'rect';
  emissionSize?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  node: Konva.Circle | Konva.Rect | null;
  pathIndex?: number;
  pathProgress?: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private config: ParticleConfig;
  private layer: Konva.Layer | null = null;
  private group: Konva.Group | null = null;
  private animation: Konva.Animation | null = null;
  private active: boolean = false;
  private emissionTimer: number = 0;

  constructor(config: ParticleConfig) {
    this.config = {
      spread: Math.PI * 2,
      gravity: 0,
      fadeOut: true,
      glow: false,
      emissionShape: 'point',
      emissionSize: 10,
      ...config
    };
  }

  init(layer: Konva.Layer) {
    this.layer = layer;
    this.group = new Konva.Group();
    layer.add(this.group);
  }

  start() {
    this.active = true;
    if (!this.animation && this.layer) {
      this.animation = new Konva.Animation((frame) => {
        if (!frame || !this.active) return;
        this.update(frame.timeDiff * 0.001);
      }, this.layer);
      this.animation.start();
    }
  }

  stop() {
    this.active = false;
  }

  pause() {
    if (this.animation) {
      this.animation.stop();
    }
  }

  resume() {
    if (this.animation && this.active) {
      this.animation.start();
    }
  }

  private update(deltaTime: number) {
    if (!this.group) return;

    // Emit new particles
    if (this.active) {
      this.emissionTimer += deltaTime;
      const emissionInterval = 1 / this.config.emissionRate;
      
      while (this.emissionTimer >= emissionInterval && this.particles.length < this.config.particleCount) {
        this.emitParticle();
        this.emissionTimer -= emissionInterval;
      }
    }

    // Update existing particles
    this.particles = this.particles.filter(particle => {
      // Update lifetime
      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        if (particle.node) {
          particle.node.destroy();
        }
        return false;
      }

      // Update physics
      if (this.config.path && particle.pathIndex !== undefined) {
        // Follow path
        this.updateParticleAlongPath(particle, deltaTime);
      } else {
        // Free particle movement
        // Apply gravity
        if (this.config.gravity) {
          particle.vy += this.config.gravity * deltaTime;
        }

        // Apply wind
        if (this.config.wind) {
          particle.vx += this.config.wind.x * deltaTime;
          particle.vy += this.config.wind.y * deltaTime;
        }

        // Update position
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
      }

      // Update visual
      if (particle.node) {
        particle.node.x(particle.x);
        particle.node.y(particle.y);

        // Fade out effect
        if (this.config.fadeOut) {
          const lifeRatio = particle.life / particle.maxLife;
          particle.node.opacity(lifeRatio);
        }

        // Size variation
        const lifeRatio = particle.life / particle.maxLife;
        const sizeFactor = 0.5 + lifeRatio * 0.5;
        particle.node.scaleX(sizeFactor);
        particle.node.scaleY(sizeFactor);
      }

      return true;
    });
  }

  private emitParticle() {
    if (!this.group) return;

    // Determine emission position
    let emitX = this.config.x;
    let emitY = this.config.y;

    switch (this.config.emissionShape) {
      case 'line':
        emitX += (Math.random() - 0.5) * this.config.emissionSize!;
        break;
      case 'circle':
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.config.emissionSize!;
        emitX += Math.cos(angle) * radius;
        emitY += Math.sin(angle) * radius;
        break;
      case 'rect':
        emitX += (Math.random() - 0.5) * this.config.emissionSize!;
        emitY += (Math.random() - 0.5) * this.config.emissionSize!;
        break;
    }

    // Determine color
    let color = this.config.particleColor;
    if (Array.isArray(color)) {
      color = color[Math.floor(Math.random() * color.length)];
    }

    // Create particle
    const particle: Particle = {
      x: emitX,
      y: emitY,
      vx: 0,
      vy: 0,
      life: this.config.lifetime,
      maxLife: this.config.lifetime,
      size: this.config.particleSize * (0.8 + Math.random() * 0.4),
      color: color as string,
      node: null
    };

    // Set initial velocity
    if (this.config.path) {
      // For path-following particles
      particle.pathIndex = 0;
      particle.pathProgress = 0;
      particle.x = this.config.path[0].x;
      particle.y = this.config.path[0].y;
    } else {
      // Random direction within spread angle
      const spreadAngle = (Math.random() - 0.5) * this.config.spread!;
      const speed = this.config.particleSpeed * (0.8 + Math.random() * 0.4);
      particle.vx = Math.cos(spreadAngle) * speed;
      particle.vy = Math.sin(spreadAngle) * speed;
    }

    // Create visual node
    particle.node = new Konva.Circle({
      x: particle.x,
      y: particle.y,
      radius: particle.size,
      fill: particle.color,
      opacity: 1
    });

    if (this.config.glow) {
      particle.node.shadowColor(particle.color);
      particle.node.shadowBlur(particle.size * 2);
      particle.node.shadowOpacity(0.8);
    }

    this.group.add(particle.node);
    this.particles.push(particle);
  }

  private updateParticleAlongPath(particle: Particle, deltaTime: number) {
    if (!this.config.path || particle.pathIndex === undefined) return;

    const path = this.config.path;
    particle.pathProgress = particle.pathProgress || 0;
    particle.pathProgress += this.config.particleSpeed * deltaTime;

    // Move to next path segment if needed
    while (particle.pathIndex < path.length - 1) {
      const current = path[particle.pathIndex];
      const next = path[particle.pathIndex + 1];
      const segmentLength = Math.sqrt(
        Math.pow(next.x - current.x, 2) + 
        Math.pow(next.y - current.y, 2)
      );

      if (particle.pathProgress >= segmentLength) {
        particle.pathProgress -= segmentLength;
        particle.pathIndex++;
      } else {
        // Interpolate position along current segment
        const t = particle.pathProgress / segmentLength;
        particle.x = current.x + (next.x - current.x) * t;
        particle.y = current.y + (next.y - current.y) * t;
        break;
      }
    }

    // Loop back to start if at end
    if (particle.pathIndex >= path.length - 1) {
      particle.pathIndex = 0;
      particle.pathProgress = 0;
    }
  }

  setEmissionRate(rate: number) {
    this.config.emissionRate = rate;
  }

  setParticleSpeed(speed: number) {
    this.config.particleSpeed = speed;
  }

  burst(count: number) {
    for (let i = 0; i < count; i++) {
      this.emitParticle();
    }
  }

  clear() {
    this.particles.forEach(particle => {
      if (particle.node) {
        particle.node.destroy();
      }
    });
    this.particles = [];
  }

  destroy() {
    this.stop();
    if (this.animation) {
      this.animation.stop();
      this.animation = null;
    }
    this.clear();
    if (this.group) {
      this.group.destroy();
      this.group = null;
    }
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  isActive(): boolean {
    return this.active;
  }
}
