import Konva from 'konva';

export interface AnimationConfig {
  duration?: number;
  easing?: Konva.Easings;
  delay?: number;
  onComplete?: () => void;
}

export interface ParticleConfig {
  count: number;
  color?: string;
  size?: number;
  speed?: number;
  spread?: number;
  lifetime?: number;
}

export interface MorphConfig {
  from: Konva.Shape;
  to: { points?: number[]; x?: number; y?: number; radius?: number };
  duration?: number;
  easing?: Konva.Easings;
}

export class AnimationEngine {
  private stage: Konva.Stage;
  private activeAnimations: Set<Konva.Tween | Konva.Animation> = new Set();
  
  constructor(stage: Konva.Stage) {
    this.stage = stage;
  }

  // Particle burst animation
  createParticleBurst(
    layer: Konva.Layer,
    x: number,
    y: number,
    config: ParticleConfig
  ): Promise<void> {
    return new Promise((resolve) => {
      const particles: Konva.Circle[] = [];
      const {
        count = 20,
        color = '#0b82f0',
        size = 3,
        speed = 200,
        spread = 360,
        lifetime = 1000
      } = config;

      for (let i = 0; i < count; i++) {
        const angle = (spread / count) * i * (Math.PI / 180);
        const particle = new Konva.Circle({
          x,
          y,
          radius: size,
          fill: color,
          opacity: 1
        });
        
        layer.add(particle);
        particles.push(particle);

        const distance = speed * (lifetime / 1000);
        const targetX = x + Math.cos(angle) * distance;
        const targetY = y + Math.sin(angle) * distance;

        const moveTween = new Konva.Tween({
          node: particle,
          duration: lifetime / 1000,
          x: targetX,
          y: targetY,
          opacity: 0,
          easing: Konva.Easings.EaseOut,
          onFinish: () => {
            particle.destroy();
            this.activeAnimations.delete(moveTween);
          }
        });

        this.activeAnimations.add(moveTween);
        moveTween.play();
      }

      setTimeout(resolve, lifetime);
    });
  }

  // Wave animation for text or shapes
  createWaveAnimation(
    nodes: Konva.Node[],
    config: AnimationConfig = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      const { duration = 1, delay = 0.05, easing = Konva.Easings.EaseInOut } = config;
      let completed = 0;

      nodes.forEach((node, index) => {
        const originalY = node.y();
        const amplitude = 20;

        setTimeout(() => {
          const tween = new Konva.Tween({
            node,
            duration: duration / 2,
            y: originalY - amplitude,
            easing,
            onFinish: () => {
              const returnTween = new Konva.Tween({
                node,
                duration: duration / 2,
                y: originalY,
                easing,
                onFinish: () => {
                  completed++;
                  this.activeAnimations.delete(returnTween);
                  if (completed === nodes.length) {
                    resolve();
                  }
                }
              });
              this.activeAnimations.add(returnTween);
              returnTween.play();
              this.activeAnimations.delete(tween);
            }
          });
          this.activeAnimations.add(tween);
          tween.play();
        }, index * delay * 1000);
      });
    });
  }

  // Morph animation between shapes
  morphShape(config: MorphConfig): Promise<void> {
    return new Promise((resolve) => {
      const { from, to, duration = 1, easing = Konva.Easings.EaseInOut } = config;
      
      const tween = new Konva.Tween({
        node: from,
        duration,
        easing,
        ...to,
        onFinish: () => {
          this.activeAnimations.delete(tween);
          resolve();
        }
      });

      this.activeAnimations.add(tween);
      tween.play();
    });
  }

  // Pulse animation for emphasis
  createPulse(
    node: Konva.Node,
    config: { scale?: number; duration?: number; repeat?: number } = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      const { scale = 1.2, duration = 0.5, repeat = 3 } = config;
      const originalScale = { x: node.scaleX(), y: node.scaleY() };
      let count = 0;

      const pulse = () => {
        const expandTween = new Konva.Tween({
          node,
          duration: duration / 2,
          scaleX: originalScale.x * scale,
          scaleY: originalScale.y * scale,
          easing: Konva.Easings.EaseOut,
          onFinish: () => {
            const contractTween = new Konva.Tween({
              node,
              duration: duration / 2,
              scaleX: originalScale.x,
              scaleY: originalScale.y,
              easing: Konva.Easings.EaseIn,
              onFinish: () => {
                count++;
                this.activeAnimations.delete(contractTween);
                if (count < repeat) {
                  pulse();
                } else {
                  resolve();
                }
              }
            });
            this.activeAnimations.add(contractTween);
            contractTween.play();
            this.activeAnimations.delete(expandTween);
          }
        });
        this.activeAnimations.add(expandTween);
        expandTween.play();
      };

      pulse();
    });
  }

  // Spiral animation for mathematical concepts
  createSpiral(
    layer: Konva.Layer,
    centerX: number,
    centerY: number,
    config: { 
      radius?: number; 
      rotations?: number; 
      duration?: number; 
      color?: string;
      width?: number;
    } = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      const {
        radius = 100,
        rotations = 3,
        duration = 2,
        color = '#0b82f0',
        width = 2
      } = config;

      const points: number[] = [];
      const steps = 100;
      
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * rotations * 2 * Math.PI;
        const r = (i / steps) * radius;
        const x = centerX + r * Math.cos(t);
        const y = centerY + r * Math.sin(t);
        points.push(x, y);
      }

      const line = new Konva.Line({
        points: [],
        stroke: color,
        strokeWidth: width,
        lineCap: 'round',
        lineJoin: 'round'
      });

      layer.add(line);

      let currentStep = 0;
      const animDuration = duration * 1000;
      const startTime = performance.now();

      const anim = new Konva.Animation((frame) => {
        const elapsed = frame.time;
        const progress = Math.min(1, elapsed / animDuration);
        const pointCount = Math.floor(progress * steps) * 2 + 2;
        line.points(points.slice(0, pointCount));
        
        if (progress >= 1) {
          anim.stop();
          this.activeAnimations.delete(anim);
          resolve();
        }
      }, layer);

      this.activeAnimations.add(anim);
      anim.start();
    });
  }

  // Ripple effect animation
  createRipple(
    layer: Konva.Layer,
    x: number,
    y: number,
    config: { 
      maxRadius?: number; 
      duration?: number; 
      color?: string;
      count?: number;
    } = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      const {
        maxRadius = 100,
        duration = 1,
        color = '#0b82f0',
        count = 3
      } = config;

      const ripples: Konva.Circle[] = [];
      const delay = duration / count * 1000;

      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const ripple = new Konva.Circle({
            x,
            y,
            radius: 0,
            stroke: color,
            strokeWidth: 2,
            opacity: 1
          });

          layer.add(ripple);
          ripples.push(ripple);

          const tween = new Konva.Tween({
            node: ripple,
            duration,
            radius: maxRadius,
            opacity: 0,
            onFinish: () => {
              ripple.destroy();
              this.activeAnimations.delete(tween);
              if (i === count - 1) {
                setTimeout(resolve, duration * 1000);
              }
            }
          });

          this.activeAnimations.add(tween);
          tween.play();
        }, i * delay);
      }
    });
  }

  // Glow effect for highlighting
  createGlow(
    node: Konva.Node,
    config: { 
      color?: string; 
      duration?: number; 
      intensity?: number;
    } = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      const { color = '#ffeb3b', duration = 0.5, intensity = 20 } = config;
      
      node.shadowColor(color);
      node.shadowBlur(0);
      node.shadowOpacity(0.8);
      
      const tween = new Konva.Tween({
        node,
        duration,
        shadowBlur: intensity,
        easing: Konva.Easings.EaseInOut,
        onFinish: () => {
          const fadeTween = new Konva.Tween({
            node,
            duration,
            shadowBlur: 0,
            shadowOpacity: 0,
            easing: Konva.Easings.EaseOut,
            onFinish: () => {
              this.activeAnimations.delete(fadeTween);
              resolve();
            }
          });
          this.activeAnimations.add(fadeTween);
          fadeTween.play();
          this.activeAnimations.delete(tween);
        }
      });

      this.activeAnimations.add(tween);
      tween.play();
    });
  }

  // Clean up all active animations
  cleanup(): void {
    this.activeAnimations.forEach(anim => {
      if ('stop' in anim) {
        anim.stop();
      } else if ('destroy' in anim) {
        anim.destroy();
      }
    });
    this.activeAnimations.clear();
  }
}
