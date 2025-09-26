import Konva from 'konva';

export interface PhysicsObject {
  id: string;
  x: number;
  y: number;
  vx: number; // velocity x
  vy: number; // velocity y
  ax: number; // acceleration x
  ay: number; // acceleration y
  mass: number;
  radius: number;
  charge?: number;
  fixed?: boolean;
  forces: Force[];
  node?: Konva.Node;
  trail?: { x: number; y: number }[];
  maxTrailLength?: number;
}

export interface Force {
  type: 'gravity' | 'electric' | 'magnetic' | 'spring' | 'friction' | 'custom';
  magnitude: number;
  direction?: { x: number; y: number };
  source?: PhysicsObject;
  calculate?: (obj: PhysicsObject, source?: PhysicsObject) => { fx: number; fy: number };
}

export class PhysicsEngine {
  private objects: Map<string, PhysicsObject> = new Map();
  private globalForces: Force[] = [];
  private time: number = 0;
  private G: number = 6.67e-11 * 1e10; // Gravitational constant (scaled)
  private k: number = 8.99e9 * 1e-6; // Coulomb's constant (scaled)
  private damping: number = 0.999; // Global damping factor

  constructor() {
    // Add default gravity if needed
    this.addGlobalForce({
      type: 'gravity',
      magnitude: 9.81 * 100, // Scaled for pixel coordinates
      direction: { x: 0, y: 1 }
    });
  }

  addObject(obj: PhysicsObject) {
    this.objects.set(obj.id, obj);
  }

  removeObject(id: string) {
    this.objects.delete(id);
  }

  addGlobalForce(force: Force) {
    this.globalForces.push(force);
  }

  update(deltaTime: number) {
    this.time += deltaTime;

    // Update each object
    this.objects.forEach(obj => {
      if (obj.fixed) return;

      // Reset accelerations
      obj.ax = 0;
      obj.ay = 0;

      // Apply global forces
      this.globalForces.forEach(force => {
        const { fx, fy } = this.calculateForce(obj, force);
        obj.ax += fx / obj.mass;
        obj.ay += fy / obj.mass;
      });

      // Apply object-specific forces
      obj.forces.forEach(force => {
        const { fx, fy } = this.calculateForce(obj, force);
        obj.ax += fx / obj.mass;
        obj.ay += fy / obj.mass;
      });

      // Calculate interactions between objects
      this.objects.forEach(other => {
        if (other.id === obj.id) return;
        
        // Gravitational attraction
        const { fx: fgx, fy: fgy } = this.calculateGravitationalForce(obj, other);
        obj.ax += fgx / obj.mass;
        obj.ay += fgy / obj.mass;

        // Electric force if charges exist
        if (obj.charge !== undefined && other.charge !== undefined) {
          const { fx: fex, fy: fey } = this.calculateElectricForce(obj, other);
          obj.ax += fex / obj.mass;
          obj.ay += fey / obj.mass;
        }

        // Collision detection and response
        this.handleCollision(obj, other);
      });

      // Update velocity with damping
      obj.vx = (obj.vx + obj.ax * deltaTime) * this.damping;
      obj.vy = (obj.vy + obj.ay * deltaTime) * this.damping;

      // Update position
      obj.x += obj.vx * deltaTime;
      obj.y += obj.vy * deltaTime;

      // Update visual node if exists
      if (obj.node) {
        obj.node.x(obj.x);
        obj.node.y(obj.y);
      }

      // Update trail if exists
      if (obj.trail && obj.maxTrailLength) {
        obj.trail.push({ x: obj.x, y: obj.y });
        if (obj.trail.length > obj.maxTrailLength) {
          obj.trail.shift();
        }
      }
    });
  }

  private calculateForce(obj: PhysicsObject, force: Force): { fx: number; fy: number } {
    if (force.calculate) {
      return force.calculate(obj, force.source);
    }

    switch (force.type) {
      case 'gravity':
        return {
          fx: force.magnitude * (force.direction?.x || 0) * obj.mass,
          fy: force.magnitude * (force.direction?.y || 1) * obj.mass
        };
      
      case 'friction':
        const speed = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
        if (speed > 0) {
          return {
            fx: -force.magnitude * obj.vx / speed,
            fy: -force.magnitude * obj.vy / speed
          };
        }
        return { fx: 0, fy: 0 };
      
      case 'spring':
        if (force.source) {
          const dx = force.source.x - obj.x;
          const dy = force.source.y - obj.y;
          return {
            fx: force.magnitude * dx,
            fy: force.magnitude * dy
          };
        }
        return { fx: 0, fy: 0 };
      
      default:
        return {
          fx: force.magnitude * (force.direction?.x || 0),
          fy: force.magnitude * (force.direction?.y || 0)
        };
    }
  }

  private calculateGravitationalForce(obj1: PhysicsObject, obj2: PhysicsObject): { fx: number; fy: number } {
    const dx = obj2.x - obj1.x;
    const dy = obj2.y - obj1.y;
    const distSq = dx * dx + dy * dy;
    
    if (distSq < 1) return { fx: 0, fy: 0 }; // Avoid division by zero
    
    const dist = Math.sqrt(distSq);
    const force = this.G * obj1.mass * obj2.mass / distSq;
    
    return {
      fx: force * dx / dist,
      fy: force * dy / dist
    };
  }

  private calculateElectricForce(obj1: PhysicsObject, obj2: PhysicsObject): { fx: number; fy: number } {
    if (!obj1.charge || !obj2.charge) return { fx: 0, fy: 0 };
    
    const dx = obj2.x - obj1.x;
    const dy = obj2.y - obj1.y;
    const distSq = dx * dx + dy * dy;
    
    if (distSq < 1) return { fx: 0, fy: 0 };
    
    const dist = Math.sqrt(distSq);
    const force = this.k * obj1.charge * obj2.charge / distSq;
    
    // Opposite charges attract, same charges repel
    const sign = (obj1.charge * obj2.charge > 0) ? -1 : 1;
    
    return {
      fx: sign * force * dx / dist,
      fy: sign * force * dy / dist
    };
  }

  private handleCollision(obj1: PhysicsObject, obj2: PhysicsObject) {
    const dx = obj2.x - obj1.x;
    const dy = obj2.y - obj1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = obj1.radius + obj2.radius;
    
    if (dist < minDist && dist > 0) {
      // Elastic collision
      const nx = dx / dist; // Normal vector
      const ny = dy / dist;
      
      // Relative velocity
      const dvx = obj2.vx - obj1.vx;
      const dvy = obj2.vy - obj1.vy;
      
      // Relative velocity in collision normal direction
      const dvn = dvx * nx + dvy * ny;
      
      // Do not resolve if velocities are separating
      if (dvn > 0) return;
      
      // Collision impulse
      const impulse = 2 * dvn / (1/obj1.mass + 1/obj2.mass);
      
      // Update velocities
      if (!obj1.fixed) {
        obj1.vx += impulse * nx / obj1.mass;
        obj1.vy += impulse * ny / obj1.mass;
      }
      if (!obj2.fixed) {
        obj2.vx -= impulse * nx / obj2.mass;
        obj2.vy -= impulse * ny / obj2.mass;
      }
      
      // Separate objects to prevent overlap
      const overlap = minDist - dist;
      const separationX = nx * overlap * 0.5;
      const separationY = ny * overlap * 0.5;
      
      if (!obj1.fixed) {
        obj1.x -= separationX;
        obj1.y -= separationY;
      }
      if (!obj2.fixed) {
        obj2.x += separationX;
        obj2.y += separationY;
      }
    }
  }

  // Specialized physics simulations
  createOrbit(center: PhysicsObject, orbiter: PhysicsObject, radius: number, period: number) {
    // Calculate orbital velocity
    const angularVelocity = (2 * Math.PI) / period;
    const orbitalSpeed = angularVelocity * radius;
    
    // Position orbiter
    orbiter.x = center.x + radius;
    orbiter.y = center.y;
    
    // Set initial velocity for circular orbit
    orbiter.vx = 0;
    orbiter.vy = orbitalSpeed;
    
    // Add gravitational force towards center
    orbiter.forces.push({
      type: 'custom',
      magnitude: 0,
      calculate: (obj) => {
        const dx = center.x - obj.x;
        const dy = center.y - obj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = orbitalSpeed * orbitalSpeed * obj.mass / dist;
        return {
          fx: force * dx / dist,
          fy: force * dy / dist
        };
      }
    });
  }

  clear() {
    this.objects.clear();
    this.globalForces = [];
    this.time = 0;
  }

  getObject(id: string): PhysicsObject | undefined {
    return this.objects.get(id);
  }

  getObjects(): PhysicsObject[] {
    return Array.from(this.objects.values());
  }

  setDamping(damping: number) {
    this.damping = Math.max(0, Math.min(1, damping));
  }

  setGravity(magnitude: number, direction?: { x: number; y: number }) {
    this.globalForces = this.globalForces.filter(f => f.type !== 'gravity');
    this.addGlobalForce({
      type: 'gravity',
      magnitude,
      direction: direction || { x: 0, y: 1 }
    });
  }
}
